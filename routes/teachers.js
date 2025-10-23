const express = require('express');
const { body } = require('express-validator');
const TeacherController = require('../controllers/teacherController');
const { authenticateToken, authorizeRoles, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Validaciones
const teacherValidation = [
  body('user_id').isInt({ min: 1 }),
  body('specialization').optional().trim(),
  body('hire_date').isDate()
];

const updateTeacherValidation = [
  body('specialization').optional().trim(),
  body('status').optional().isIn(['active', 'inactive'])
];

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas para profesores
router.get('/profile', requirePermission('read'), TeacherController.getTeacherProfile);
router.get('/courses', requirePermission('read'), TeacherController.getTeacherCourses);

// Rutas para coordinadores y administradores
router.get('/', authorizeRoles('admin', 'coordinator'), TeacherController.getAllTeachers);
router.get('/:id', authorizeRoles('admin', 'coordinator'), TeacherController.getTeacherProfile);
router.post('/', authorizeRoles('admin', 'coordinator'), teacherValidation, TeacherController.createTeacher);
router.put('/:id', authorizeRoles('admin', 'coordinator'), updateTeacherValidation, TeacherController.updateTeacher);

module.exports = router;