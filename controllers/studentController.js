const { query } = require('../config/database');
const { validationResult } = require('express-validator');

class StudentController {
  static async getStudentProfile(req, res) {
    try {
      const studentId = req.user.role === 'student' ? req.user.userId : req.params.id;

      const result = await query(
        `SELECT s.*, u.first_name, u.last_name, u.email, u.phone, 
                c.name as career_name, c.code as career_code
         FROM students s
         JOIN users u ON s.user_id = u.id
         LEFT JOIN careers c ON s.career_id = c.id
         WHERE s.user_id = $1 AND s.status = 'active'`,
        [studentId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Estudiante no encontrado' });
      }

      res.json({ student: result.rows[0] });
    } catch (error) {
      console.error('Error obteniendo perfil de estudiante:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async getAllStudents(req, res) {
    try {
      const { page = 1, limit = 10, career, status } = req.query;
      const offset = (page - 1) * limit;

      let whereConditions = ['s.status IS NOT NULL'];
      const queryParams = [limit, offset];

      if (career) {
        queryParams.push(career);
        whereConditions.push(`s.career_id = $${queryParams.length}`);
      }

      if (status) {
        queryParams.push(status);
        whereConditions.push(`s.status = $${queryParams.length}`);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const result = await query(
        `SELECT s.*, u.first_name, u.last_name, u.email, u.phone,
                c.name as career_name, c.code as career_code,
                COUNT(*) OVER() as total_count
         FROM students s
         JOIN users u ON s.user_id = u.id
         LEFT JOIN careers c ON s.career_id = c.id
         ${whereClause}
         ORDER BY s.created_at DESC
         LIMIT $1 OFFSET $2`,
        queryParams
      );

      const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        students: result.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error('Error obteniendo estudiantes:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async createStudent(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { user_id, career_id, enrollment_date, current_semester = 1 } = req.body;

      // Generar código de estudiante único
      const studentCode = await generateStudentCode();

      const result = await query(
        `INSERT INTO students (user_id, student_code, career_id, enrollment_date, current_semester)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [user_id, studentCode, career_id, enrollment_date, current_semester]
      );

      res.status(201).json({
        message: 'Estudiante creado exitosamente',
        student: result.rows[0]
      });
    } catch (error) {
      console.error('Error creando estudiante:', error);
      
      if (error.code === '23505') {
        return res.status(400).json({ error: 'El usuario ya tiene un estudiante registrado' });
      }
      if (error.code === '23503') {
        return res.status(400).json({ error: 'Usuario o carrera no válida' });
      }

      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async getStudentGrades(req, res) {
    try {
      const studentId = req.user.role === 'student' ? req.user.userId : req.params.id;

      const result = await query(
        `SELECT g.*, c.name as course_name, c.code as course_code,
                ac.year as academic_year, ac.semester as academic_semester,
                t.first_name as teacher_first_name, t.last_name as teacher_last_name
         FROM grades g
         JOIN enrollments e ON g.enrollment_id = e.id
         JOIN course_assignments ca ON e.course_assignment_id = ca.id
         JOIN courses c ON ca.course_id = c.id
         JOIN academic_cycles ac ON ca.academic_cycle_id = ac.id
         JOIN teachers t ON ca.teacher_id = t.id
         JOIN students s ON e.student_id = s.id
         WHERE s.user_id = $1
         ORDER BY ac.year DESC, ac.semester DESC, c.name ASC`,
        [studentId]
      );

      res.json({ grades: result.rows });
    } catch (error) {
      console.error('Error obteniendo notas del estudiante:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async enrollInCourse(req, res) {
    try {
      const studentId = req.user.role === 'student' ? req.user.userId : req.params.id;
      const { course_assignment_id } = req.body;

      // Verificar si el estudiante existe y está activo
      const studentCheck = await query(
        'SELECT id FROM students WHERE user_id = $1 AND status = $2',
        [studentId, 'active']
      );

      if (studentCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Estudiante no encontrado o inactivo' });
      }

      // Verificar disponibilidad del curso
      const courseCheck = await query(
        `SELECT ca.*, c.name as course_name, 
                (ca.current_students < ca.max_students) as has_space
         FROM course_assignments ca
         JOIN courses c ON ca.course_id = c.id
         WHERE ca.id = $1 AND ca.is_active = true`,
        [course_assignment_id]
      );

      if (courseCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Asignación de curso no encontrada' });
      }

      if (!courseCheck.rows[0].has_space) {
        return res.status(400).json({ error: 'El curso no tiene cupos disponibles' });
      }

      // Inscribir estudiante
      const result = await query(
        `INSERT INTO enrollments (student_id, course_assignment_id)
         VALUES ($1, $2)
         RETURNING *`,
        [studentCheck.rows[0].id, course_assignment_id]
      );

      // Actualizar contador de estudiantes
      await query(
        'UPDATE course_assignments SET current_students = current_students + 1 WHERE id = $1',
        [course_assignment_id]
      );

      res.status(201).json({
        message: 'Inscripción exitosa',
        enrollment: result.rows[0]
      });
    } catch (error) {
      console.error('Error en inscripción:', error);
      
      if (error.code === '23505') {
        return res.status(400).json({ error: 'El estudiante ya está inscrito en este curso' });
      }

      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}

// Función auxiliar para generar código de estudiante único
async function generateStudentCode() {
  const year = new Date().getFullYear().toString().slice(-2);
  const result = await query(
    'SELECT COUNT(*) as count FROM students WHERE student_code LIKE $1',
    [`${year}%`]
  );
  
  const count = parseInt(result.rows[0].count) + 1;
  return `${year}${count.toString().padStart(4, '0')}`;
}

module.exports = StudentController;