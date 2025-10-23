const { query } = require('../config/database');

class Enrollment {
  static async create(enrollmentData) {
    const { student_id, course_assignment_id } = enrollmentData;
    
    // Verificar disponibilidad
    const availability = await this.checkAvailability(course_assignment_id);
    if (!availability.available) {
      throw new Error(availability.message);
    }

    const result = await query(
      `INSERT INTO enrollments (student_id, course_assignment_id)
       VALUES ($1, $2)
       RETURNING *`,
      [student_id, course_assignment_id]
    );

    // Actualizar contador de estudiantes
    await query(
      'UPDATE course_assignments SET current_students = current_students + 1 WHERE id = $1',
      [course_assignment_id]
    );
    
    return result.rows[0];
  }

  static async checkAvailability(courseAssignmentId) {
    const result = await query(
      `SELECT ca.max_students, ca.current_students,
              c.name as course_name, c.code as course_code
       FROM course_assignments ca
       JOIN courses c ON ca.course_id = c.id
       WHERE ca.id = $1 AND ca.is_active = true`,
      [courseAssignmentId]
    );

    if (result.rows.length === 0) {
      return { available: false, message: 'Asignación de curso no encontrada o inactiva' };
    }

    const assignment = result.rows[0];
    
    if (assignment.current_students >= assignment.max_students) {
      return { 
        available: false, 
        message: `El curso ${assignment.course_name} (${assignment.course_code}) no tiene cupos disponibles` 
      };
    }

    return { available: true };
  }

  static async updateStatus(id, status) {
    const allowedStatuses = ['enrolled', 'completed', 'dropped', 'failed'];
    
    if (!allowedStatuses.includes(status)) {
      throw new Error('Estado no válido');
    }

    const result = await query(
      'UPDATE enrollments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );

    return result.rows[0];
  }

  static async findByStudentAndCourse(studentId, courseAssignmentId) {
    const result = await query(
      `SELECT e.*, c.name as course_name, c.code as course_code
       FROM enrollments e
       JOIN course_assignments ca ON e.course_assignment_id = ca.id
       JOIN courses c ON ca.course_id = c.id
       WHERE e.student_id = $1 AND e.course_assignment_id = $2`,
      [studentId, courseAssignmentId]
    );

    return result.rows[0];
  }

  static async getStudentEnrollments(studentId, status = null) {
    let whereCondition = 'e.student_id = $1';
    const params = [studentId];

    if (status) {
      params.push(status);
      whereCondition += ' AND e.status = $2';
    }

    const result = await query(
      `SELECT e.*, 
              c.name as course_name, c.code as course_code, c.credits,
              t.first_name as teacher_first_name, t.last_name as teacher_last_name,
              s.name as shift_name,
              ac.year as academic_year, ac.semester as academic_semester,
              ca.classroom
       FROM enrollments e
       JOIN course_assignments ca ON e.course_assignment_id = ca.id
       JOIN courses c ON ca.course_id = c.id
       JOIN teachers t ON ca.teacher_id = t.id
       JOIN shifts s ON ca.shift_id = s.id
       JOIN academic_cycles ac ON ca.academic_cycle_id = ac.id
       WHERE ${whereCondition}
       ORDER BY ac.year DESC, ac.semester DESC, c.name ASC`,
      params
    );

    return result.rows;
  }
}

module.exports = Enrollment;