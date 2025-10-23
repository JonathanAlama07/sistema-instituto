const User = require('../models/User');
const { query } = require('../config/database');
const { validationResult } = require('express-validator');

class UserController {
  static async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 10, role_id, is_active } = req.query;
      const offset = (page - 1) * limit;

      let whereConditions = ['u.is_active IS NOT NULL'];
      const queryParams = [limit, offset];

      if (role_id) {
        queryParams.push(role_id);
        whereConditions.push(`u.role_id = $${queryParams.length}`);
      }

      if (is_active !== undefined) {
        queryParams.push(is_active === 'true');
        whereConditions.push(`u.is_active = $${queryParams.length}`);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const result = await query(
        `SELECT u.id, u.username, u.email, u.first_name, u.last_name, 
                u.phone, u.address, u.date_of_birth, u.is_active, u.last_login,
                u.created_at, u.updated_at,
                r.name as role_name,
                COUNT(*) OVER() as total_count
         FROM users u
         LEFT JOIN roles r ON u.role_id = r.id
         ${whereClause}
         ORDER BY u.created_at DESC
         LIMIT $1 OFFSET $2`,
        queryParams
      );

      const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        users: result.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async getUserById(req, res) {
    try {
      const { id } = req.params;
      
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Excluir password de la respuesta
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });

    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async createUser(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = await User.create(req.body);

      res.status(201).json({
        message: 'Usuario creado exitosamente',
        user
      });

    } catch (error) {
      console.error('Error creando usuario:', error);
      
      if (error.code === '23505') {
        if (error.constraint.includes('email')) {
          return res.status(400).json({ error: 'El email ya está registrado' });
        }
        if (error.constraint.includes('username')) {
          return res.status(400).json({ error: 'El nombre de usuario ya existe' });
        }
      }
      if (error.code === '23503') {
        return res.status(400).json({ error: 'Rol no válido' });
      }

      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async updateUser(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      
      // Verificar que el usuario existe
      const existingUser = await User.findById(id);
      if (!existingUser) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const allowedFields = ['first_name', 'last_name', 'phone', 'address', 'date_of_birth', 'is_active'];
      const updateFields = [];
      const values = [];
      let paramCount = 1;

      Object.keys(req.body).forEach(key => {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = $${paramCount}`);
          values.push(req.body[key]);
          paramCount++;
        }
      });

      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No hay campos válidos para actualizar' });
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      const result = await query(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount} 
         RETURNING id, username, email, first_name, last_name, phone, address, date_of_birth, is_active, created_at, updated_at`,
        values
      );

      res.json({
        message: 'Usuario actualizado exitosamente',
        user: result.rows[0]
      });

    } catch (error) {
      console.error('Error actualizando usuario:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async deleteUser(req, res) {
    try {
      const { id } = req.params;

      // Verificar que el usuario existe
      const existingUser = await User.findById(id);
      if (!existingUser) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // No permitir eliminar el propio usuario
      if (parseInt(id) === req.user.userId) {
        return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
      }

      // Soft delete - marcar como inactivo
      await query(
        'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
      );

      res.json({ message: 'Usuario eliminado exitosamente' });

    } catch (error) {
      console.error('Error eliminando usuario:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async getMyProfile(req, res) {
    try {
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });

    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async updateMyProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const allowedFields = ['first_name', 'last_name', 'phone', 'address', 'date_of_birth'];
      const updateFields = [];
      const values = [];
      let paramCount = 1;

      Object.keys(req.body).forEach(key => {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = $${paramCount}`);
          values.push(req.body[key]);
          paramCount++;
        }
      });

      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No hay campos válidos para actualizar' });
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(req.user.userId);

      const result = await query(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount} 
         RETURNING id, username, email, first_name, last_name, phone, address, date_of_birth, created_at, updated_at`,
        values
      );

      res.json({
        message: 'Perfil actualizado exitosamente',
        user: result.rows[0]
      });

    } catch (error) {
      console.error('Error actualizando perfil:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}

module.exports = UserController;