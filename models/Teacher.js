const { query } = require('../config/database');

class Teacher {
  static async create(teacherData) {
    const { user_id, specialization, hire_date } = teacherData;
    
    // Generar código de profesor único
    const teacherCode = await this.generateTeacherCode();
    
    const result = await query(
      `INSERT INTO teachers (user_id, teacher_code, specialization, hire_date)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user_id, teacherCode, specialization, hire_date]
    );
    
    return result.rows[0];
  }

  static async findById(id) {
    const result = await query(
      `SELECT t.*, u.first_name, u.last_name, u.email, u.phone, u.date_of_birth
       FROM teachers t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = $1 AND t.status = 'active'`,
      [id]
    );
    return result.rows[0];
  }

  static async findByUserId(userId) {
    const result = await query(
      `SELECT t.*, u.first_name, u.last_name, u.email, u.phone, u.date_of_birth
       FROM teachers t
       JOIN users u ON t.user_id = u.id
       WHERE t.user_id = $1 AND t.status = 'active'`,
      [userId]
    );
    return result.rows[0];
  }

  static async update(id, updateData) {
    const allowedFields = ['specialization', 'status'];
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
      `UPDATE teachers SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0];
  }

  static async getAll(filters = {}) {
    const { page = 1, limit = 10, status } = filters;
    const offset = (page - 1) * limit;

    let whereConditions = ['t.status IS NOT NULL'];
    const queryParams = [limit, offset];

    if (status) {
      queryParams.push(status);
      whereConditions.push(`t.status = $${queryParams.length}`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT t.*, u.first_name, u.last_name, u.email, u.phone,
              COUNT(*) OVER() as total_count
       FROM teachers t
       JOIN users u ON t.user_id = u.id
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT $1 OFFSET $2`,
      queryParams
    );

    return {
      teachers: result.rows,
      totalCount: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0
    };
  }

  static async getAssignedCourses(teacherId) {
    const result = await query(
      `SELECT ca.*, c.name as course_name, c.code as course_code, c.credits,
              ac.year as academic_year, ac.semester as academic_semester,
              s.name as shift_name, s.start_time, s.end_time,
              COUNT(e.id) as enrolled_students
       FROM course_assignments ca
       JOIN courses c ON ca.course_id = c.id
       JOIN academic_cycles ac ON ca.academic_cycle_id = ac.id
       JOIN shifts s ON ca.shift_id = s.id
       LEFT JOIN enrollments e ON ca.id = e.course_assignment_id AND e.status = 'enrolled'
       WHERE ca.teacher_id = $1 AND ca.is_active = true
       GROUP BY ca.id, c.name, c.code, c.credits, ac.year, ac.semester, s.name, s.start_time, s.end_time
       ORDER BY ac.year DESC, ac.semester DESC, c.name ASC`,
      [teacherId]
    );

    return result.rows;
  }

  static async generateTeacherCode() {
    const result = await query(
      'SELECT COUNT(*) as count FROM teachers WHERE teacher_code LIKE $1',
      ['PROF%']
    );
    
    const count = parseInt(result.rows[0].count) + 1;
    return `PROF${count.toString().padStart(4, '0')}`;
  }
}

module.exports = Teacher;