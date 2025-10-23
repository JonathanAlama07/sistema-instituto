const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

const app = express();

// Middlewares de seguridad
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors());
app.use(compression());

// Limitador de tasa de solicitudes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// Logging
app.use(morgan('combined'));

// Middleware para parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use(express.static('public'));

// ==================== CARGA DE RUTAS ====================
console.log('🔄 INICIANDO CARGA DE RUTAS API...');

try {
  // Ruta principal de API
  const mainRoutes = require('./routes');
  app.use('/api', mainRoutes);
  console.log('✅ Ruta principal /api cargada');

  // Cargar rutas específicas con manejo de errores
  const routeConfigs = [
    { path: '/api/auth', file: './routes/auth' },
    { path: '/api/users', file: './routes/users' },
    { path: '/api/students', file: './routes/students' },
    { path: '/api/teachers', file: './routes/teachers' },
    { path: '/api/courses', file: './routes/courses' },
    { path: '/api/careers', file: './routes/careers' },
    { path: '/api/grades', file: './routes/grades' }
  ];

  routeConfigs.forEach(config => {
    try {
      const routeModule = require(config.file);
      app.use(config.path, routeModule);
      console.log(`✅ ${config.path} cargado correctamente`);
    } catch (error) {
      console.error(`❌ ERROR cargando ${config.path}:`, error.message);
    }
  });

  console.log('🎯 TODAS LAS RUTAS CONFIGURADAS');

} catch (error) {
  console.error('🚨 ERROR CRÍTICO en carga de rutas:', error);
}
// ==================== FIN CARGA DE RUTAS ====================

// Ruta de verificación de salud
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Ruta principal - Servir el frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta para evitar error de favicon
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Manejo de errores 404 para API
app.use('/api/*', (req, res) => {
  console.log(`❌ Ruta API no encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Endpoint de API no encontrado',
    path: req.originalUrl,
    method: req.method
  });
});

// Para SPA - servir index.html para cualquier ruta no manejada
app.use('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Manejo global de errores
app.use((error, req, res, next) => {
  console.error('❌ Error no manejado:', error);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { details: error.message })
  });
});

// Inicializar servidor
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('\n🎉 =================================');
  console.log('🚀 Servidor INICIADO CORRECTAMENTE');
  console.log('=================================');
  console.log(`📍 Puerto: ${PORT}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log(`📊 Frontend: ✅ Cargando`);
  console.log(`🔐 API: Ver logs arriba`);
  console.log('=================================\n');
});

module.exports = app;