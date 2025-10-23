const express = require('express');
const { body } = require('express-validator');
const UserController = require('../controllers/userController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Validaciones
const userValidation = [
  body('username').isLength({ min: 3 }).isAlphanumeric(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('first_name').notEmpty().trim(),
  body('last_name').notEmpty().trim(),
  body('role_id').isInt({ min: 1 })
];

const updateUserValidation = [
  body('first_name').optional().notEmpty().trim(),
  body('last_name').optional().notEmpty().trim(),
  body('phone').optional().isMobilePhone(),
  body('address').optional().trim(),
  body('date_of_birth').optional().isDate(),
  body('is_active').optional().isBoolean()
];

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas para administradores
router.get('/', authorizeRoles('admin'), UserController.getAllUsers);
router.get('/:id', authorizeRoles('admin'), UserController.getUserById);
router.post('/', authorizeRoles('admin'), userValidation, UserController.createUser);
router.put('/:id', authorizeRoles('admin'), updateUserValidation, UserController.updateUser);
router.delete('/:id', authorizeRoles('admin'), UserController.deleteUser);

// Rutas para perfil de usuario (accesible por el propio usuario)
router.get('/profile/me', UserController.getMyProfile);
router.put('/profile/me', updateUserValidation, UserController.updateMyProfile);

module.exports = router;