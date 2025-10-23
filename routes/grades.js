const express = require('express');
const { body } = require('express-validator');
const GradeController = require('../controllers/gradeController');
const { authenticateToken, authorizeRoles, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Validaciones
const gradeValidation = [
  body('enrollment_id').isInt({ min: 1 }),
  body('evaluation_type').isLength({ min: 2 }).trim(),
  body('grade').isFloat({ min: 0, max: 100 }),
  body('weight').isFloat({ min: 0, max: 1 })
];

const updateGradeValidation = [
  body('evaluation_type').optional().isLength({ min: 2 }).trim(),
  body('grade').optional().isFloat({ min: 0, max: 100 }),
  body('weight').optional().isFloat({ min: 0, max: 1 }),
  body('comments').optional().trim()
];

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas para profesores
router.get('/enrollment/:enrollment_id', requirePermission('write_grades'), GradeController.getEnrollmentGrades);
router.get('/course/:course_assignment_id', requirePermission('write_grades'), GradeController.getCourseGrades);
router.post('/', requirePermission('write_grades'), gradeValidation, GradeController.createGrade);
router.put('/:id', requirePermission('write_grades'), updateGradeValidation, GradeController.updateGrade);

module.exports = router;