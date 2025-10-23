const { query } = require('../config/database');

class Shift {
  static async create(shiftData) {
    const { name, start_time, end_time, description } = shiftData;
    
    const result = await query(
      `INSERT INTO shifts (name, start_time, end_time, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, start_time, end_time, description]
    );
    
    return result.rows[0];
  }

  static async findById(id) {
    const result = await query(
      'SELECT * FROM shifts WHERE id = $1 AND is_active = true',
      [id]
    );
    return result.rows[0];
  }

  static async getAll(filters = {}) {
    const { page = 1, limit = 10, is_active = true } = filters;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT *, COUNT(*) OVER() as total_count
       FROM shifts 
       WHERE is_active = $1
       ORDER BY start_time ASC
       LIMIT $2 OFFSET $3`,
      [is_active, limit, offset]
    );

    return {
      shifts: result.rows,
      totalCount: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0
    };
  }

  static async update(id, updateData) {
    const allowedFields = ['name', 'start_time', 'end_time', 'description', 'is_active'];
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
      `UPDATE shifts SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0];
  }
}

module.exports = Shift;