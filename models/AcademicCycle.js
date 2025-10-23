const { query } = require('../config/database');

class AcademicCycle {
  static async create(cycleData) {
    const { name, year, semester, start_date, end_date, registration_start, registration_end, created_by } = cycleData;
    
    const result = await query(
      `INSERT INTO academic_cycles (name, year, semester, start_date, end_date, registration_start, registration_end, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, year, semester, start_date, end_date, registration_start, registration_end, created_by]
    );
    
    return result.rows[0];
  }

  static async findById(id) {
    const result = await query(
      `SELECT ac.*, 
              u.first_name as created_by_name, u.last_name as created_by_last_name
       FROM academic_cycles ac
       LEFT JOIN users u ON ac.created_by = u.id
       WHERE ac.id = $1 AND ac.is_active = true`,
      [id]
    );
    return result.rows[0];
  }

  static async getCurrentCycle() {
    const result = await query(
      `SELECT * FROM academic_cycles 
       WHERE is_active = true 
         AND start_date <= CURRENT_DATE 
         AND end_date >= CURRENT_DATE
       ORDER BY start_date DESC
       LIMIT 1`
    );

    return result.rows[0];
  }

  static async getAll(filters = {}) {
    const { page = 1, limit = 10, year, semester, is_active } = filters;
    const offset = (page - 1) * limit;

    let whereConditions = ['is_active IS NOT NULL'];
    const queryParams = [limit, offset];

    if (year) {
      queryParams.push(year);
      whereConditions.push(`year = $${queryParams.length}`);
    }

    if (semester) {
      queryParams.push(semester);
      whereConditions.push(`semester = $${queryParams.length}`);
    }

    if (is_active !== undefined) {
      queryParams.push(is_active);
      whereConditions.push(`is_active = $${queryParams.length}`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT *, COUNT(*) OVER() as total_count
       FROM academic_cycles
       ${whereClause}
       ORDER BY year DESC, semester DESC
       LIMIT $1 OFFSET $2`,
      queryParams
    );

    return {
      cycles: result.rows,
      totalCount: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0
    };
  }

  static async update(id, updateData) {
    const allowedFields = ['name', 'start_date', 'end_date', 'registration_start', 'registration_end', 'is_active'];
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
      `UPDATE academic_cycles SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0];
  }

  static async getCycleStats(cycleId) {
    const coursesResult = await query(
      `SELECT COUNT(DISTINCT ca.course_id) as total_courses,
              COUNT(DISTINCT ca.teacher_id) as total_teachers,
              COUNT(DISTINCT ca.id) as total_assignments
       FROM course_assignments ca
       WHERE ca.academic_cycle_id = $1 AND ca.is_active = true`,
      [cycleId]
    );

    const enrollmentsResult = await query(
      `SELECT COUNT(DISTINCT e.student_id) as total_students,
              COUNT(*) as total_enrollments
       FROM enrollments e
       JOIN course_assignments ca ON e.course_assignment_id = ca.id
       WHERE ca.academic_cycle_id = $1 AND e.status = 'enrolled'`,
      [cycleId]
    );

    return {
      ...coursesResult.rows[0],
      ...enrollmentsResult.rows[0]
    };
  }
}

module.exports = AcademicCycle;