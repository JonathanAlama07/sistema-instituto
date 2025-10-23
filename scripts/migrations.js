const { pool } = require('../config/database');

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    console.log('Ejecutando migraciones...');

    // Migración 1: Agregar campo de fecha de modificación a users si no existe
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='users' AND column_name='updated_at') THEN
          ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;
      END $$;
    `);

    // Migración 2: Crear tabla de logs de actividades si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50),
        resource_id INTEGER,
        details JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migración 3: Índice para búsqueda en logs
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);
    `);

    // Migración 4: Agregar campos de auditoría a las tablas principales
    const tablesToAudit = ['careers', 'courses', 'students', 'teachers', 'academic_cycles'];
    
    for (const table of tablesToAudit) {
      await client.query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name='${table}' AND column_name='updated_at') THEN
            ALTER TABLE ${table} ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
          END IF;
        END $$;
      `);
    }

    console.log('Migraciones completadas exitosamente');
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en migraciones:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Ejecutar migraciones si se llama directamente
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Proceso de migración finalizado');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error en el proceso de migración:', error);
      process.exit(1);
    });
}

module.exports = { runMigrations };const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🛠️  INSTALACIÓN SEGURA - INSTITUTO WEB');
console.log('=========================================\n');

try {
  // Verificar Node.js
  const nodeVersion = process.version;
  console.log(`✅ Node.js version: ${nodeVersion}`);
  
  if (parseFloat(process.versions.node) < 16) {
    console.log('❌ Se requiere Node.js 16 o superior');
    process.exit(1);
  }

  // Limpiar instalación previa
  console.log('\n🧹 Limpiando instalación previa...');
  if (fs.existsSync('node_modules')) {
    fs.rmSync('node_modules', { recursive: true, force: true });
  }
  if (fs.existsSync('package-lock.json')) {
    fs.unlinkSync('package-lock.json');
  }

  // Instalar dependencias de forma segura
  console.log('📦 Instalando dependencias seguras...');
  
  const dependencies = [
    'express@4.18.2',
    'pg@8.11.3', 
    'bcryptjs@2.4.3',
    'jsonwebtoken@9.0.2',
    'dotenv@16.3.1',
    'cors@2.8.5',
    'helmet@7.1.0',
    'morgan@1.10.0',
    'express-rate-limit@7.1.5',
    'compression@1.7.4',
    'express-validator@7.0.1',
    'nodemailer@6.9.7'
  ];

  const devDependencies = [
    'nodemon@3.0.1',
    'jest@29.6.4'
  ];

  console.log('\n🔧 Instalando dependencias principales...');
  dependencies.forEach(dep => {
    console.log(`   📥 Instalando: ${dep}`);
    execSync(`npm install ${dep} --no-audit --fund false --save`, { stdio: 'inherit' });
  });

  console.log('\n🔧 Instalando dependencias de desarrollo...');
  devDependencies.forEach(dep => {
    console.log(`   📥 Instalando: ${dep}`);
    execSync(`npm install ${dep} --no-audit --fund false --save-dev`, { stdio: 'inherit' });
  });

  console.log('\n✅ VERIFICACIÓN FINAL');
  console.log('=====================');
  
  // Verificar instalación
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const installedDeps = Object.keys(packageJson.dependencies || {});
  const installedDevDeps = Object.keys(packageJson.devDependencies || {});
  
  console.log(`📊 Dependencias instaladas: ${installedDeps.length}`);
  console.log(`📊 Dev Dependencias instaladas: ${installedDevDeps.length}`);
  
  if (installedDeps.length >= 10 && installedDevDeps.length >= 2) {
    console.log('🎉 ¡INSTALACIÓN COMPLETADA EXITOSAMENTE!');
    console.log('\n📝 PRÓXIMOS PASOS:');
    console.log('   1. Crear archivo .env con la configuración de la base de datos');
    console.log('   2. Ejecutar: npm run init-db');
    console.log('   3. Ejecutar: npm run dev');
    console.log('   4. Abrir: http://localhost:3000');
  } else {
    console.log('⚠️  Instalación completada con advertencias');
  }

} catch (error) {
  console.error('❌ ERROR durante la instalación:', error.message);
  process.exit(1);
}