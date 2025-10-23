const Grade = require('../models/Grade');
const Enrollment = require('../models/Enrollment');
const { validationResult } = require('express-validator');

class GradeController {
  static async createGrade(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const gradeData = {
        ...req.body,
        evaluated_by: req.user.userId
      };

      // Verificar que el profesor tiene permiso para calificar esta inscripción
      const canGrade = await GradeController.verifyGradingPermission(gradeData.enrollment_id, req.user.userId);
      if (!canGrade) {
        return res.status(403).json({ error: 'No tiene permisos para calificar esta inscripción' });
      }

      const grade = await Grade.create(gradeData);

      res.status(201).json({
        message: 'Calificación creada exitosamente',
        grade
      });
    } catch (error) {
      console.error('Error creando calificación:', error);
      
      if (error.code === '23503') {
        return res.status(400).json({ error: 'Inscripción o profesor no válido' });
      }

      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async getEnrollmentGrades(req, res) {
    try {
      const { enrollment_id } = req.params;
      
      const grades = await Grade.findByEnrollmentId(enrollment_id);

      res.json({ grades });
    } catch (error) {
      console.error('Error obteniendo calificaciones:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async updateGrade(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;

      // Verificar permisos para actualizar
      const grade = await Grade.findById(id);
      if (!grade) {
        return res.status(404).json({ error: 'Calificación no encontrada' });
      }

      const canGrade = await GradeController.verifyGradingPermission(grade.enrollment_id, req.user.userId);
      if (!canGrade) {
        return res.status(403).json({ error: 'No tiene permisos para actualizar esta calificación' });
      }

      const updatedGrade = await Grade.update(id, req.body);

      res.json({
        message: 'Calificación actualizada exitosamente',
        grade: updatedGrade
      });
    } catch (error) {
      console.error('Error actualizando calificación:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async getCourseGrades(req, res) {
    try {
      const { course_assignment_id } = req.params;

      // Verificar que el profesor tiene acceso a estas calificaciones
      const canAccess = await GradeController.verifyCourseAccess(course_assignment_id, req.user.userId);
      if (!canAccess) {
        return res.status(403).json({ error: 'No tiene acceso a las calificaciones de este curso' });
      }

      const grades = await Grade.getCourseGrades(course_assignment_id);

      res.json({ grades });
    } catch (error) {
      console.error('Error obteniendo calificaciones del curso:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  static async verifyGradingPermission(enrollmentId, teacherId) {
    const { query } = require('../config/database');
    
    const result = await query(
      `SELECT ca.teacher_id 
       FROM enrollments e
       JOIN course_assignments ca ON e.course_assignment_id = ca.id
       WHERE e.id = $1`,
      [enrollmentId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    return result.rows[0].teacher_id === teacherId;
  }

  static async verifyCourseAccess(courseAssignmentId, teacherId) {
    const { query } = require('../config/database');
    
    const result = await query(
      'SELECT teacher_id FROM course_assignments WHERE id = $1',
      [courseAssignmentId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    // Permitir acceso al profesor asignado o a administradores/coordinadores
    return result.rows[0].teacher_id === teacherId;
  }
}

module.exports = GradeController;