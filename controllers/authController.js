const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

class AuthController {
  static async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      console.log('🔐 Intentando login para:', email);

      // Buscar usuario por email
      const user = await User.findByEmail(email);
      if (!user) {
        console.log('❌ Usuario no encontrado:', email);
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      // Verificar contraseña
      const isValidPassword = await User.comparePassword(password, user.password);
      if (!isValidPassword) {
        console.log('❌ Contraseña incorrecta para:', email);
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      // Actualizar último login
      await User.updateLastLogin(user.id);

      // Generar token JWT
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          role: user.role_name,
          permissions: user.permissions
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      // Excluir password de la respuesta
      const { password: _, ...userWithoutPassword } = user;

      console.log('✅ Login exitoso para:', email);

      res.json({
        message: 'Login exitoso',
        token,
        user: userWithoutPassword
      });

    } catch (error) {
      console.error('❌ Error en login:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userData = req.body;
      
      console.log('📝 Intentando registro para:', userData.email);

      // Por defecto, nuevo usuario es estudiante (role_id = 3)
      if (!userData.role_id) {
        userData.role_id = 3;
      }

      const newUser = await User.create(userData);

      console.log('✅ Registro exitoso para:', userData.email);

      res.status(201).json({
        message: 'Usuario registrado exitosamente',
        user: newUser
      });

    } catch (error) {
      console.error('❌ Error en registro:', error);
      
      if (error.code === '23505') { // Violación de unique constraint
        if (error.constraint.includes('email')) {
          return res.status(400).json({ error: 'El email ya está registrado' });
        }
        if (error.constraint.includes('username')) {
          return res.status(400).json({ error: 'El nombre de usuario ya existe' });
        }
      }

      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });

    } catch (error) {
      console.error('❌ Error obteniendo perfil:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async updateProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const updatedUser = await User.update(req.user.userId, req.body);

      res.json({
        message: 'Perfil actualizado exitosamente',
        user: updatedUser
      });

    } catch (error) {
      console.error('❌ Error actualizando perfil:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}

module.exports = AuthController;