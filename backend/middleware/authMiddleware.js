const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <TOKEN>

  if (!token) {
    return res.status(401).json({
      status: 'ERROR',
      message: 'Acceso denegado. Token de autenticación ausente.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secreto_studio5_2026');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({
      status: 'ERROR',
      message: 'Token de autenticación inválido o expirado.'
    });
  }
};
