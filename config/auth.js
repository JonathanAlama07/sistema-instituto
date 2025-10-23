const jwt = require('jsonwebtoken');

const authConfig = {
  // Secret key para JWT - CAMBIAR EN PRODUCCIÓN
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret_key_change_in_production',
  
  // Tiempo de expiración del token
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // Configuración de bcrypt
  bcryptRounds: 10,
  
  // Roles y permisos del sistema
  roles: {
    admin: {
      permissions: {
        all: true
      }
    },
    coordinator: {
      permissions: {
        read: true,
        write: true,
        manage_teachers: true,
        manage_courses: true,
        all_academic: true
      }
    },
    teacher: {
      permissions: {
        read: true,
        write_grades: true,
        manage_courses: true
      }
    },
    student: {
      permissions: {
        read: true,
        enroll_courses: true
      }
    }
  },
  
  // Middleware para verificar token
  verifyToken: (token) => {
    return new Promise((resolve, reject) => {
      jwt.verify(token, authConfig.jwtSecret, (err, decoded) => {
        if (err) {
          reject(err);
        } else {
          resolve(decoded);
        }
      });
    });
  },
  
  // Generar token
  generateToken: (payload) => {
    return jwt.sign(payload, authConfig.jwtSecret, { 
      expiresIn: authConfig.jwtExpiresIn 
    });
  }
};

module.exports = authConfig;