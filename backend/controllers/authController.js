const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

// Registro de usuarios (Comprador registrado, Staff o Admin)
exports.register = async (req, res) => {
  const { name, email, phone, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'Nombre, correo y contraseña son campos obligatorios.'
    });
  }

  try {
    // Verificar si el correo ya existe
    const userExist = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (userExist.rows.length > 0) {
      return res.status(400).json({
        status: 'ERROR',
        message: 'El correo electrónico ya se encuentra registrado.'
      });
    }

    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Asignar rol por defecto 'buyer' si no se especifica o no es admin/staff
    const userRole = role && ['admin', 'staff', 'buyer'].includes(role) ? role : 'buyer';

    // Insertar en la BD
    const result = await query(
      'INSERT INTO users (name, email, phone, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, created_at',
      [name, email, phone, passwordHash, userRole]
    );

    res.status(201).json({
      status: 'OK',
      message: 'Usuario registrado exitosamente',
      user: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al registrar el usuario',
      error: err.message
    });
  }
};

// Login de usuarios (Autenticación unificada)
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'Correo y contraseña son campos obligatorios.'
    });
  }

  try {
    // Buscar usuario en la BD
    const userRes = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({
        status: 'ERROR',
        message: 'Credenciales inválidas. Correo o contraseña incorrectos.'
      });
    }

    const user = userRes.rows[0];

    // Verificar si tiene contraseña (los compradores invitados no tienen password_hash)
    if (!user.password_hash) {
      return res.status(401).json({
        status: 'ERROR',
        message: 'Esta cuenta no tiene una contraseña asignada. Compra como invitado o regístrate.'
      });
    }

    // Comparar contraseñas
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        status: 'ERROR',
        message: 'Credenciales inválidas. Correo o contraseña incorrectos.'
      });
    }

    // Firmar JWT
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'super_secreto_studio5_2026',
      { expiresIn: '30d' } // Expira en 30 días para evitar deslogueos recurrentes en PWA
    );

    res.json({
      status: 'OK',
      message: 'Autenticación exitosa',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al iniciar sesión',
      error: err.message
    });
  }
};

// Obtener datos del usuario logueado actualmente
exports.getMe = async (req, res) => {
  try {
    const userRes = await query('SELECT id, name, email, phone, role, created_at FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        message: 'Usuario no encontrado.'
      });
    }
    res.json({
      status: 'OK',
      user: userRes.rows[0]
    });
  } catch (err) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al obtener información del usuario',
      error: err.message
    });
  }
};
