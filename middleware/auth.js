const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido o expirado' });
    }
    req.user = user;
    next();
  });
};

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'No tiene permisos para realizar esta acción' 
      });
    }

    next();
  };
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const userPermissions = req.user.permissions;
    
    // Si el usuario tiene permiso "all", permitir todo
    if (userPermissions.all === true) {
      return next();
    }

    // Verificar permiso específico
    if (!userPermissions[permission]) {
      return res.status(403).json({ 
        error: `Permiso "${permission}" requerido` 
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  requirePermission
};