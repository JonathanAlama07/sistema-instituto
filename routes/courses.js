const express = require('express');
const { body } = require('express-validator');
const CourseController = require('../controllers/courseController');
const { authenticateToken, authorizeRoles, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Validaciones
const courseValidation = [
  body('code').isLength({ min: 3 }).matches(/^[A-Z0-9]+$/),
  body('name').isLength({ min: 3 }).trim(),
  body('credits').isInt({ min: 1, max: 10 }),
  body('hours_per_week').isInt({ min: 1, max: 20 }),
  body('career_id').isInt({ min: 1 })
];

const updateCourseValidation = [
  body('name').optional().isLength({ min: 3 }).trim(),
  body('credits').optional().isInt({ min: 1, max: 10 }),
  body('hours_per_week').optional().isInt({ min: 1, max: 20 }),
  body('career_id').optional().isInt({ min: 1 }),
  body('is_active').optional().isBoolean()
];

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas públicas (para usuarios autenticados)
router.get('/available', requirePermission('read'), CourseController.getAvailableCourses);
router.get('/:id', requirePermission('read'), CourseController.getCourseById);
router.get('/:id/assignments', requirePermission('read'), CourseController.getCourseAssignments);

// Rutas para estudiantes
router.get('/', requirePermission('read'), CourseController.getAllCourses);

// Rutas para coordinadores y administradores
router.post('/', authorizeRoles('admin', 'coordinator'), courseValidation, CourseController.createCourse);
router.put('/:id', authorizeRoles('admin', 'coordinator'), updateCourseValidation, CourseController.updateCourse);

module.exports = router;