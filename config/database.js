const { Pool } = require('pg');
require('dotenv').config();

// CONFIGURACIÓN DE LA BASE DE DATOS - MODIFICAR SEGÚN EL ENTORNO
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Verificar conexión a la base de datos
pool.on('connect', () => {
  console.log('Conexión a PostgreSQL establecida correctamente');
});

pool.on('error', (err) => {
  console.error('Error en la conexión a PostgreSQL:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};