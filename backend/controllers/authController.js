const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { sendVerificationOtpEmail } = require('../services/emailService');

// Helper para generar código OTP de 6 dígitos numéricos
const generateOtpCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// 1. Registro de usuarios con envío de OTP
exports.register = async (req, res) => {
  const { name, email, phone, password, role, workgroup_organizer_id } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'Nombre, correo y contraseña son campos obligatorios.'
    });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();

  try {
    // Verificar si el correo ya existe
    const userExistRes = await query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userRole = role && ['staff', 'buyer', 'organizer'].includes(role) ? role : 'buyer';

    let user;

    if (userExistRes.rows.length > 0) {
      const existingUser = userExistRes.rows[0];

      // Si ya está verificado, no permitir re-registro
      if (existingUser.is_verified) {
        return res.status(400).json({
          status: 'ERROR',
          message: 'Este correo electrónico ya se encuentra registrado y verificado. Por favor inicia sesión.'
        });
      }

      // Si existía pero no estaba verificado, actualizamos datos y reenviamos OTP
      const updateRes = await query(
        `UPDATE users 
         SET name = $1, phone = $2, password_hash = $3, role = $4, verification_code = $5, verification_code_expires_at = $6, workgroup_organizer_id = $7, updated_at = NOW()
         WHERE id = $8
         RETURNING id, name, email, phone, role, is_verified`,
        [cleanName, phone || null, passwordHash, userRole, otpCode, expiresAt, workgroup_organizer_id || null, existingUser.id]
      );
      user = updateRes.rows[0];
    } else {
      // Nuevo registro
      const insertRes = await query(
        `INSERT INTO users 
         (name, email, phone, password_hash, role, is_verified, verification_code, verification_code_expires_at, workgroup_organizer_id)
         VALUES ($1, $2, $3, $4, $5, FALSE, $6, $7, $8)
         RETURNING id, name, email, phone, role, is_verified, created_at`,
        [cleanName, cleanEmail, phone || null, passwordHash, userRole, otpCode, expiresAt, workgroup_organizer_id || null]
      );
      user = insertRes.rows[0];
    }

    // Enviar código OTP por correo
    await sendVerificationOtpEmail({
      email: cleanEmail,
      name: cleanName,
      code: otpCode
    });

    res.status(201).json({
      status: 'PENDING_VERIFICATION',
      message: 'Te hemos enviado un código de 6 dígitos a tu correo para activar tu cuenta.',
      email: cleanEmail,
      user
    });
  } catch (err) {
    console.error('Error en registro:', err);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al procesar el registro.',
      error: err.message
    });
  }
};

// 2. Verificación de Código OTP
exports.verifyOtp = async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'El correo y el código de verificación son obligatorios.'
    });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.trim();

  try {
    const userRes = await query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        message: 'No se encontró ninguna cuenta asociada a este correo.'
      });
    }

    const user = userRes.rows[0];

    // Verificar si ya estaba verificado
    if (user.is_verified) {
      const token = jwt.sign(
        { id: user.id, name: user.name, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'super_secreto_studio5_2026',
        { expiresIn: '30d' }
      );
      return res.json({
        status: 'OK',
        message: 'Tu cuenta ya se encuentra verificada.',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          token_tarjeta: user.token_tarjeta,
          debt_balance: user.debt_balance
        }
      });
    }

    // Validar código OTP y vigencia
    if (!user.verification_code || user.verification_code !== cleanCode) {
      return res.status(400).json({
        status: 'ERROR',
        message: 'El código de verificación ingresado es incorrecto.'
      });
    }

    if (new Date() > new Date(user.verification_code_expires_at)) {
      return res.status(400).json({
        status: 'ERROR',
        message: 'El código de verificación ha expirado. Solicita uno nuevo.'
      });
    }

    // Activar cuenta y limpiar código
    await query(
      `UPDATE users 
       SET is_verified = TRUE, verification_code = NULL, verification_code_expires_at = NULL, updated_at = NOW()
       WHERE id = $1`,
      [user.id]
    );

    // Emitir Token JWT
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'super_secreto_studio5_2026',
      { expiresIn: '30d' }
    );

    res.json({
      status: 'OK',
      message: '¡Cuenta verificada con éxito!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        token_tarjeta: user.token_tarjeta,
        debt_balance: user.debt_balance
      }
    });
  } catch (err) {
    console.error('Error al verificar OTP:', err);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al verificar el código.',
      error: err.message
    });
  }
};

// 3. Reenvío de Código OTP
exports.resendOtp = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'El correo electrónico es obligatorio.'
    });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const userRes = await query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        message: 'No existe una cuenta registrada con este correo.'
      });
    }

    const user = userRes.rows[0];

    if (user.is_verified) {
      return res.status(400).json({
        status: 'ERROR',
        message: 'Esta cuenta ya está verificada. Puedes iniciar sesión directamente.'
      });
    }

    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await query(
      `UPDATE users 
       SET verification_code = $1, verification_code_expires_at = $2, updated_at = NOW() 
       WHERE id = $3`,
      [otpCode, expiresAt, user.id]
    );

    await sendVerificationOtpEmail({
      email: cleanEmail,
      name: user.name,
      code: otpCode
    });

    res.json({
      status: 'OK',
      message: 'Se ha reenviado un nuevo código de 6 dígitos a tu correo electrónico.'
    });
  } catch (err) {
    console.error('Error al reenviar OTP:', err);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al reenviar el código.',
      error: err.message
    });
  }
};

// 4. Login de usuarios con compuerta de verificación
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'Correo y contraseña son campos obligatorios.'
    });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    // Buscar usuario en la BD
    const userRes = await query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({
        status: 'ERROR',
        message: 'Credenciales inválidas. Correo o contraseña incorrectos.'
      });
    }

    const user = userRes.rows[0];

    // Verificar si tiene contraseña
    if (!user.password_hash) {
      return res.status(401).json({
        status: 'ERROR',
        message: 'Esta cuenta no tiene una contraseña asignada. Regístrate para crearla.'
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

    // Si la cuenta no está verificada, reenviar código OTP y avisar al frontend
    if (!user.is_verified && user.role !== 'admin') {
      const otpCode = generateOtpCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await query(
        `UPDATE users 
         SET verification_code = $1, verification_code_expires_at = $2, updated_at = NOW() 
         WHERE id = $3`,
        [otpCode, expiresAt, user.id]
      );

      await sendVerificationOtpEmail({
        email: cleanEmail,
        name: user.name,
        code: otpCode
      });

      return res.status(403).json({
        status: 'UNVERIFIED',
        message: 'Tu cuenta aún no ha sido verificada. Hemos enviado un nuevo código de 6 dígitos a tu correo.',
        email: cleanEmail
      });
    }

    // Firmar JWT
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'super_secreto_studio5_2026',
      { expiresIn: '30d' }
    );

    res.json({
      status: 'OK',
      message: 'Autenticación exitosa',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        token_tarjeta: user.token_tarjeta,
        debt_balance: user.debt_balance
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

// 5. Obtener datos del usuario logueado actualmente
exports.getMe = async (req, res) => {
  try {
    const userRes = await query(
      'SELECT id, name, email, phone, role, is_verified, token_tarjeta, debt_balance, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
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
