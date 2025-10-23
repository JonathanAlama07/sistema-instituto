const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create(userData) {
    const {
      username,
      email,
      password,
      role_id,
      first_name,
      last_name,
      phone,
      address,
      date_of_birth
    } = userData;

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (username, email, password, role_id, first_name, last_name, phone, address, date_of_birth) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING id, username, email, role_id, first_name, last_name, created_at`,
      [username, email, hashedPassword, role_id, first_name, last_name, phone, address, date_of_birth]
    );

    return result.rows[0];
  }

  static async findByEmail(email) {
    const result = await query(
      `SELECT users.*, roles.name as role_name, roles.permissions 
       FROM users 
       LEFT JOIN roles ON users.role_id = roles.id 
       WHERE email = $1 AND is_active = true`,
      [email]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await query(
      `SELECT users.*, roles.name as role_name, roles.permissions 
       FROM users 
       LEFT JOIN roles ON users.role_id = roles.id 
       WHERE users.id = $1 AND is_active = true`,
      [id]
    );
    return result.rows[0];
  }

  static async update(id, updateData) {
    const allowedFields = ['first_name', 'last_name', 'phone', 'address', 'date_of_birth'];
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

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount} 
       RETURNING id, username, email, first_name, last_name, phone, address, date_of_birth`,
      values
    );

    return result.rows[0];
  }

  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async updateLastLogin(userId) {
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );
  }
}

module.exports = User;