const bcrypt = require('bcryptjs');
const { query } = require('../config/db');

// Listar todos los usuarios (admin y staff)
exports.getAllUsers = async (req, res) => {
  try {
    const result = await query(
      "SELECT id, name, email, phone, role, created_at FROM users WHERE role IN ('admin','staff') ORDER BY role, name ASC"
    );
    res.json({ status: 'OK', users: result.rows });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
};

// Crear nuevo usuario
exports.createUser = async (req, res) => {
  const { name, email, phone, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ status: 'ERROR', message: 'Nombre, correo, contraseña y rol son obligatorios.' });
  }
  if (!['admin', 'staff'].includes(role)) {
    return res.status(400).json({ status: 'ERROR', message: 'El rol debe ser admin o staff.' });
  }
  try {
    const exists = await query('SELECT id FROM users WHERE LOWER(email)=LOWER($1)', [email]);
    if (exists.rows.length > 0) {
      return res.status(400).json({ status: 'ERROR', message: 'El correo ya está registrado.' });
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO users (name, email, phone, password_hash, role) VALUES ($1,$2,$3,$4,$5) RETURNING id, name, email, phone, role, created_at',
      [name, email, phone || null, hash, role]
    );
    res.status(201).json({ status: 'OK', message: 'Usuario creado exitosamente.', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
};

// Actualizar usuario (nombre, teléfono, rol, contraseña)
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, phone, role, password } = req.body;

  // Evitar que un admin se quite su propio rol
  if (req.user.id === id && role && role !== 'admin') {
    return res.status(400).json({ status: 'ERROR', message: 'No puedes cambiar tu propio rol.' });
  }

  try {
    const fields = [];
    const values = [];
    let i = 1;
    if (name)  { fields.push(`name=$${i++}`);          values.push(name); }
    if (phone) { fields.push(`phone=$${i++}`);         values.push(phone); }
    if (role && ['admin', 'staff'].includes(role)) {
                  fields.push(`role=$${i++}`);         values.push(role); }
    if (password && password.length >= 6) {
      const hash = await bcrypt.hash(password, 10);
                  fields.push(`password_hash=$${i++}`); values.push(hash);
    }
    if (fields.length === 0) {
      return res.status(400).json({ status: 'ERROR', message: 'Nada que actualizar.' });
    }
    values.push(id);
    const result = await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id=$${i} RETURNING id, name, email, phone, role`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'ERROR', message: 'Usuario no encontrado.' });
    }
    res.json({ status: 'OK', message: 'Usuario actualizado.', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
};

// Eliminar usuario
exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  if (req.user.id === id) {
    return res.status(400).json({ status: 'ERROR', message: 'No puedes eliminarte a ti mismo.' });
  }
  try {
    const result = await query('DELETE FROM users WHERE id=$1 AND role IN (\'admin\',\'staff\') RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'ERROR', message: 'Usuario no encontrado.' });
    }
    res.json({ status: 'OK', message: 'Usuario eliminado.' });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
};
