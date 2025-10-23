const { execSync } = require('child_process');
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