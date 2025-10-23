const { query } = require('../config/database');

class Career {
  static async create(careerData) {
    const { code, name, description, duration_years, total_credits, created_by } = careerData;
    
    const result = await query(
      `INSERT INTO careers (code, name, description, duration_years, total_credits, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [code, name, description, duration_years, total_credits, created_by]
    );
    
    return result.rows[0];
  }

  static async findById(id) {
    const result = await query(
      `SELECT c.*, u.first_name as created_by_name, u.last_name as created_by_last_name
       FROM careers c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = $1 AND c.is_active = true`,
      [id]
    );
    return result.rows[0];
  }

  static async findByCode(code) {
    const result = await query(
      'SELECT * FROM careers WHERE code = $1 AND is_active = true',
      [code]
    );
    return result.rows[0];
  }

  static async update(id, updateData) {
    const allowedFields = ['name', 'description', 'duration_years', 'total_credits', 'is_active'];
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
      `UPDATE careers SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0];
  }

  static async getAll(filters = {}) {
    const { page = 1, limit = 10, is_active } = filters;
    const offset = (page - 1) * limit;

    let whereConditions = ['is_active IS NOT NULL'];
    const queryParams = [limit, offset];

    if (is_active !== undefined) {
      queryParams.push(is_active);
      whereConditions.push(`is_active = $${queryParams.length}`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT c.*, 
              u.first_name as created_by_name, u.last_name as created_by_last_name,
              COUNT(*) OVER() as total_count
       FROM careers c
       LEFT JOIN users u ON c.created_by = u.id
       ${whereClause}
       ORDER BY c.name ASC
       LIMIT $1 OFFSET $2`,
      queryParams
    );

    return {
      careers: result.rows,
      totalCount: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0
    };
  }

  static async getCareerCourses(careerId) {
    const result = await query(
      `SELECT c.*, 
              pre.name as prerequisite_name,
              COUNT(DISTINCT ca.id) as active_assignments
       FROM courses c
       LEFT JOIN courses pre ON c.prerequisite_course_id = pre.id
       LEFT JOIN course_assignments ca ON c.id = ca.course_id AND ca.is_active = true
       WHERE c.career_id = $1 AND c.is_active = true
       GROUP BY c.id, pre.name
       ORDER BY c.name ASC`,
      [careerId]
    );

    return result.rows;
  }

  static async getCareerStats(careerId) {
    const studentsResult = await query(
      'SELECT COUNT(*) as total_students FROM students WHERE career_id = $1 AND status = $2',
      [careerId, 'active']
    );

    const coursesResult = await query(
      'SELECT COUNT(*) as total_courses FROM courses WHERE career_id = $1 AND is_active = true',
      [careerId]
    );

    return {
      total_students: parseInt(studentsResult.rows[0].total_students),
      total_courses: parseInt(coursesResult.rows[0].total_courses)
    };
  }
}

module.exports = Career;