const { pool } = require('../config/database');

async function initializeDatabase() {
  try {
    console.log('Inicializando base de datos...');

    // Crear tablas
    await createTables();
    
    // Insertar datos iniciales
    await insertInitialData();
    
    console.log('Base de datos inicializada correctamente');
  } catch (error) {
    console.error('Error inicializando la base de datos:', error);
  } finally {
    pool.end();
  }
}

async function createTables() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Tabla de roles de usuario
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        permissions JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de usuarios
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role_id INTEGER REFERENCES roles(id),
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        address TEXT,
        date_of_birth DATE,
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de carreras
    await client.query(`
      CREATE TABLE IF NOT EXISTS careers (
        id SERIAL PRIMARY KEY,
        code VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        duration_years INTEGER NOT NULL,
        total_credits INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de turnos
    await client.query(`
      CREATE TABLE IF NOT EXISTS shifts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de ciclos lectivos
    await client.query(`
      CREATE TABLE IF NOT EXISTS academic_cycles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        year INTEGER NOT NULL,
        semester INTEGER NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        registration_start DATE,
        registration_end DATE,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(year, semester)
      )
    `);

    // Tabla de cursos/materias
    await client.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        code VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        credits INTEGER NOT NULL,
        hours_per_week INTEGER NOT NULL,
        career_id INTEGER REFERENCES careers(id),
        prerequisite_course_id INTEGER REFERENCES courses(id),
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de estudiantes
    await client.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id),
        student_code VARCHAR(20) UNIQUE NOT NULL,
        career_id INTEGER REFERENCES careers(id),
        enrollment_date DATE NOT NULL,
        current_semester INTEGER DEFAULT 1,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de profesores
    await client.query(`
      CREATE TABLE IF NOT EXISTS teachers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id),
        teacher_code VARCHAR(20) UNIQUE NOT NULL,
        specialization TEXT,
        hire_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de asignación de cursos a profesores
    await client.query(`
      CREATE TABLE IF NOT EXISTS course_assignments (
        id SERIAL PRIMARY KEY,
        course_id INTEGER REFERENCES courses(id),
        teacher_id INTEGER REFERENCES teachers(id),
        academic_cycle_id INTEGER REFERENCES academic_cycles(id),
        shift_id INTEGER REFERENCES shifts(id),
        classroom VARCHAR(50),
        max_students INTEGER,
        current_students INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(course_id, teacher_id, academic_cycle_id, shift_id)
      )
    `);

    // Tabla de inscripciones
    await client.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id),
        course_assignment_id INTEGER REFERENCES course_assignments(id),
        enrollment_date DATE DEFAULT CURRENT_DATE,
        status VARCHAR(20) DEFAULT 'enrolled',
        final_grade DECIMAL(4,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, course_assignment_id)
      )
    `);

    // Tabla de notas
    await client.query(`
      CREATE TABLE IF NOT EXISTS grades (
        id SERIAL PRIMARY KEY,
        enrollment_id INTEGER REFERENCES enrollments(id),
        evaluation_type VARCHAR(50) NOT NULL,
        grade DECIMAL(4,2) NOT NULL,
        weight DECIMAL(3,2) NOT NULL,
        comments TEXT,
        evaluated_by INTEGER REFERENCES teachers(id),
        evaluation_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Índices para mejorar el rendimiento
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
      CREATE INDEX IF NOT EXISTS idx_students_career ON students(career_id);
      CREATE INDEX IF NOT EXISTS idx_courses_career ON courses(career_id);
      CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
      CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_assignment_id);
      CREATE INDEX IF NOT EXISTS idx_grades_enrollment ON grades(enrollment_id);
      CREATE INDEX IF NOT EXISTS idx_course_assignments_teacher ON course_assignments(teacher_id);
    `);

    await client.query('COMMIT');
    console.log('Tablas creadas correctamente');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function insertInitialData() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Insertar roles iniciales
    await client.query(`
      INSERT INTO roles (name, description, permissions) VALUES
      ('admin', 'Administrador del sistema', '{"all": true}'),
      ('teacher', 'Profesor', '{"read": true, "write_grades": true, "manage_courses": true}'),
      ('student', 'Estudiante', '{"read": true, "enroll_courses": true}'),
      ('coordinator', 'Coordinador académico', '{"all_academic": true, "manage_teachers": true}')
      ON CONFLICT (name) DO NOTHING
    `);

    // Insertar usuario administrador por defecto
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await client.query(`
      INSERT INTO users (username, email, password, role_id, first_name, last_name, is_active) 
      VALUES ('admin', 'admin@instituto.edu', $1, 1, 'Administrador', 'Sistema', true)
      ON CONFLICT (username) DO NOTHING
    `, [hashedPassword]);

    // Insertar turnos por defecto
    await client.query(`
      INSERT INTO shifts (name, start_time, end_time, description) VALUES
      ('Matutino', '07:00:00', '12:00:00', 'Turno de la mañana'),
      ('Vespertino', '13:00:00', '18:00:00', 'Turno de la tarde'),
      ('Nocturno', '18:30:00', '22:30:00', 'Turno de la noche')
      ON CONFLICT DO NOTHING
    `);

    console.log('Datos iniciales insertados correctamente');
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Ejecutar inicialización si se llama directamente
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };