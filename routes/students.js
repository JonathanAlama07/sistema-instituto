const express = require('express');
const StudentController = require('../controllers/studentController');
const { authenticateToken, authorizeRoles, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas accesibles para estudiantes y superiores
router.get('/profile', requirePermission('read'), StudentController.getStudentProfile);
router.get('/grades', requirePermission('read'), StudentController.getStudentGrades);
router.get('/courses', requirePermission('read'), StudentController.getStudentCourses);

// Rutas para coordinadores y administradores
router.get('/', authorizeRoles('admin', 'coordinator'), StudentController.getAllStudents);
router.get('/:id', authorizeRoles('admin', 'coordinator'), StudentController.getStudentById);
router.post('/', authorizeRoles('admin', 'coordinator'), StudentController.createStudent);
router.put('/:id', authorizeRoles('admin', 'coordinator'), StudentController.updateStudent);
router.delete('/:id', authorizeRoles('admin'), StudentController.deleteStudent);

// Rutas de inscripción
router.post('/:id/enroll', requirePermission('enroll_courses'), StudentController.enrollInCourse);
router.get('/:id/enrollments', requirePermission('read'), StudentController.getStudentEnrollments);

module.exports = router;