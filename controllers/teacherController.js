const Teacher = require('../models/Teacher');
const { validationResult } = require('express-validator');

class TeacherController {
  static async createTeacher(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const teacher = await Teacher.create(req.body);

      res.status(201).json({
        message: 'Profesor creado exitosamente',
        teacher
      });
    } catch (error) {
      console.error('Error creando profesor:', error);
      
      if (error.code === '23505') {
        return res.status(400).json({ error: 'El usuario ya tiene un profesor registrado' });
      }
      if (error.code === '23503') {
        return res.status(400).json({ error: 'Usuario no válido' });
      }

      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async getTeacherProfile(req, res) {
    try {
      const teacherId = req.user.role === 'teacher' ? req.user.userId : req.params.id;
      
      const teacher = await Teacher.findByUserId(teacherId);
      if (!teacher) {
        return res.status(404).json({ error: 'Profesor no encontrado' });
      }

      res.json({ teacher });
    } catch (error) {
      console.error('Error obteniendo perfil de profesor:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async getAllTeachers(req, res) {
    try {
      const { page, limit, status } = req.query;
      
      const result = await Teacher.getAll({ page, limit, status });

      res.json({
        teachers: result.teachers,
        pagination: {
          currentPage: parseInt(page) || 1,
          totalPages: Math.ceil(result.totalCount / (parseInt(limit) || 10)),
          totalCount: result.totalCount
        }
      });
    } catch (error) {
      console.error('Error obteniendo profesores:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async getTeacherCourses(req, res) {
    try {
      const teacherId = req.user.role === 'teacher' ? req.user.userId : req.params.id;
      
      const teacher = await Teacher.findByUserId(teacherId);
      if (!teacher) {
        return res.status(404).json({ error: 'Profesor no encontrado' });
      }

      const courses = await Teacher.getAssignedCourses(teacher.id);

      res.json({ courses });
    } catch (error) {
      console.error('Error obteniendo cursos del profesor:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async updateTeacher(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const updatedTeacher = await Teacher.update(id, req.body);

      res.json({
        message: 'Profesor actualizado exitosamente',
        teacher: updatedTeacher
      });
    } catch (error) {
      console.error('Error actualizando profesor:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}

module.exports = TeacherController;