const express = require('express');
const { body } = require('express-validator');
const CareerController = require('../controllers/careerController');
const { authenticateToken, authorizeRoles, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Validaciones
const careerValidation = [
  body('code').isLength({ min: 2 }).matches(/^[A-Z0-9]+$/),
  body('name').isLength({ min: 5 }).trim(),
  body('duration_years').isInt({ min: 1, max: 6 }),
  body('total_credits').isInt({ min: 1 })
];

const updateCareerValidation = [
  body('name').optional().isLength({ min: 5 }).trim(),
  body('duration_years').optional().isInt({ min: 1, max: 6 }),
  body('total_credits').optional().isInt({ min: 1 }),
  body('is_active').optional().isBoolean()
];

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas públicas (para usuarios autenticados)
router.get('/', requirePermission('read'), CareerController.getAllCareers);
router.get('/:id', requirePermission('read'), CareerController.getCareerById);
router.get('/:id/courses', requirePermission('read'), CareerController.getCareerCourses);
router.get('/:id/stats', requirePermission('read'), CareerController.getCareerStats);

// Rutas para coordinadores y administradores
router.post('/', authorizeRoles('admin', 'coordinator'), careerValidation, CareerController.createCareer);
router.put('/:id', authorizeRoles('admin', 'coordinator'), updateCareerValidation, CareerController.updateCareer);

module.exports = router;