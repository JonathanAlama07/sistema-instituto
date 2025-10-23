const { query } = require('../config/database');

class Student {
  static async create(studentData) {
    const { user_id, career_id, enrollment_date, current_semester = 1 } = studentData;
    
    // Generar código de estudiante único
    const studentCode = await this.generateStudentCode();
    
    const result = await query(
      `INSERT INTO students (user_id, student_code, career_id, enrollment_date, current_semester)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user_id, studentCode, career_id, enrollment_date, current_semester]
    );
    
    return result.rows[0];
  }

  static async findById(id) {
    const result = await query(
      `SELECT s.*, u.first_name, u.last_name, u.email, u.phone, u.date_of_birth,
              c.name as career_name, c.code as career_code
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN careers c ON s.career_id = c.id
       WHERE s.id = $1 AND s.status = 'active'`,
      [id]
    );
    return result.rows[0];
  }

  static async findByUserId(userId) {
    const result = await query(
      `SELECT s.*, u.first_name, u.last_name, u.email, u.phone, u.date_of_birth,
              c.name as career_name, c.code as career_code
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN careers c ON s.career_id = c.id
       WHERE s.user_id = $1 AND s.status = 'active'`,
      [userId]
    );
    return result.rows[0];
  }

  static async update(id, updateData) {
    const allowedFields = ['career_id', 'current_semester', 'status'];
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${paramCount}`);
        values.push(updateData[key]);
        paramCount++;
      }
    });

    if (updateFields.length === 0) {
      throw new Error('No hay campos válidos para actualizar');
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const result = await query(
      `UPDATE students SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0];
  }

  static async getAll(filters = {}) {
    const { page = 1, limit = 10, career_id, status } = filters;
    const offset = (page - 1) * limit;

    let whereConditions = ['s.status IS NOT NULL'];
    const queryParams = [limit, offset];

    if (career_id) {
      queryParams.push(career_id);
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

    return {
      students: result.rows,
      totalCount: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0
    };
  }

  static async getStudentGrades(studentId) {
    const result = await query(
      `SELECT g.*, c.name as course_name, c.code as course_code,
              ac.year as academic_year, ac.semester as academic_semester,
              t.first_name as teacher_first_name, t.last_name as teacher_last_name,
              e.final_grade
       FROM enrollments e
       LEFT JOIN grades g ON e.id = g.enrollment_id
       JOIN course_assignments ca ON e.course_assignment_id = ca.id
       JOIN courses c ON ca.course_id = c.id
       JOIN academic_cycles ac ON ca.academic_cycle_id = ac.id
       JOIN teachers t ON ca.teacher_id = t.id
       WHERE e.student_id = $1
       ORDER BY ac.year DESC, ac.semester DESC, c.name ASC`,
      [studentId]
    );

    return result.rows;
  }

  static async getStudentCourses(studentId) {
    const result = await query(
      `SELECT e.*, c.name as course_name, c.code as course_code, c.credits,
              ac.year as academic_year, ac.semester as academic_semester,
              t.first_name as teacher_first_name, t.last_name as teacher_last_name,
              s.name as shift_name, s.start_time, s.end_time,
              ca.classroom
       FROM enrollments e
       JOIN course_assignments ca ON e.course_assignment_id = ca.id
       JOIN courses c ON ca.course_id = c.id
       JOIN academic_cycles ac ON ca.academic_cycle_id = ac.id
       JOIN teachers t ON ca.teacher_id = t.id
       JOIN shifts s ON ca.shift_id = s.id
       WHERE e.student_id = $1
       ORDER BY ac.year DESC, ac.semester DESC, c.name ASC`,
      [studentId]
    );

    return result.rows;
  }

  static async generateStudentCode() {
    const year = new Date().getFullYear().toString().slice(-2);
    const result = await query(
      'SELECT COUNT(*) as count FROM students WHERE student_code LIKE $1',
      [`${year}%`]
    );
    
    const count = parseInt(result.rows[0].count) + 1;
    return `${year}${count.toString().padStart(4, '0')}`;
  }
}

module.exports = Student;