const express = require('express');
const router = express.Router();

// Importar todas las rutas
const authRoutes = require('./auth');
const userRoutes = require('./users');
const studentRoutes = require('./students');
const teacherRoutes = require('./teachers');
const courseRoutes = require('./courses');
const careerRoutes = require('./careers');
const gradeRoutes = require('./grades');

// Configurar rutas
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/students', studentRoutes);
router.use('/teachers', teacherRoutes);
router.use('/courses', courseRoutes);
router.use('/careers', careerRoutes);
router.use('/grades', gradeRoutes);

module.exports = router;