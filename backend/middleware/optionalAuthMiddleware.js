const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secreto_studio5_2026');
      req.user = decoded;
    } catch (err) {
      // Ignorar error de token inválido para rutas opcionales, tratar como usuario público
      console.log('Token opcional inválido o vencido');
    }
  }
  
  next();
};
