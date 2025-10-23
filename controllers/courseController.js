const Course = require('../models/Course');
const AcademicCycle = require('../models/AcademicCycle');
const { validationResult } = require('express-validator');

class CourseController {
  static async createCourse(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const courseData = {
        ...req.body,
        created_by: req.user.userId
      };

      const course = await Course.create(courseData);

      res.status(201).json({
        message: 'Curso creado exitosamente',
        course
      });
    } catch (error) {
      console.error('Error creando curso:', error);
      
      if (error.code === '23505') {
        return res.status(400).json({ error: 'El código del curso ya existe' });
      }
      if (error.code === '23503') {
        return res.status(400).json({ error: 'Carrera o curso prerrequisito no válido' });
      }

      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async getAllCourses(req, res) {
    try {
      const { page, limit, career_id, is_active } = req.query;
      
      const result = await Course.getAll({ page, limit, career_id, is_active });

      res.json({
        courses: result.courses,
        pagination: {
          currentPage: parseInt(page) || 1,
          totalPages: Math.ceil(result.totalCount / (parseInt(limit) || 10)),
          totalCount: result.totalCount
        }
      });
    } catch (error) {
      console.error('Error obteniendo cursos:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async getCourseById(req, res) {
    try {
      const { id } = req.params;
      
      const course = await Course.findById(id);
      if (!course) {
        return res.status(404).json({ error: 'Curso no encontrado' });
      }

      res.json({ course });
    } catch (error) {
      console.error('Error obteniendo curso:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async getAvailableCourses(req, res) {
    try {
      const { academic_cycle_id } = req.query;
      let studentId = null;

      // Si es estudiante, obtener su ID
      if (req.user.role === 'student') {
        const Student = require('../models/Student');
        const student = await Student.findByUserId(req.user.userId);
        if (student) {
          studentId = student.id;
        }
      }

      let cycleId = academic_cycle_id;
      if (!cycleId) {
        // Obtener ciclo actual si no se especifica
        const currentCycle = await AcademicCycle.getCurrentCycle();
        if (!currentCycle) {
          return res.status(404).json({ error: 'No hay ciclo académico activo' });
        }
        cycleId = currentCycle.id;
      }

      const courses = await Course.getAvailableCourses(cycleId, studentId);

      res.json({ courses });
    } catch (error) {
      console.error('Error obteniendo cursos disponibles:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async updateCourse(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const updatedCourse = await Course.update(id, req.body);

      res.json({
        message: 'Curso actualizado exitosamente',
        course: updatedCourse
      });
    } catch (error) {
      console.error('Error actualizando curso:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async getCourseAssignments(req, res) {
    try {
      const { id } = req.params;
      const { academic_cycle_id } = req.query;

      const assignments = await Course.getCourseAssignments(id, academic_cycle_id);

      res.json({ assignments });
    } catch (error) {
      console.error('Error obteniendo asignaciones del curso:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}

module.exports = CourseController;