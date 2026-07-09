const { query } = require('../config/db');

// Obtener solo cuentas activas (Público)
exports.getBankAccountsPublic = async (req, res) => {
  try {
    const result = await query('SELECT * FROM bank_accounts WHERE is_active = true ORDER BY bank_name ASC');
    res.json({ status: 'OK', bankAccounts: result.rows });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: 'Error al obtener cuentas bancarias', error: err.message });
  }
};

// Obtener todas las cuentas (Admin)
exports.getBankAccountsAdmin = async (req, res) => {
  try {
    const result = await query('SELECT * FROM bank_accounts ORDER BY created_at DESC');
    res.json({ status: 'OK', bankAccounts: result.rows });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: 'Error al obtener cuentas bancarias para admin', error: err.message });
  }
};

// Crear nueva cuenta (Admin)
exports.createBankAccount = async (req, res) => {
  const { bank_name, account_type, account_number, owner_name, owner_id, owner_email, is_active } = req.body;
  if (!bank_name || !account_type || !account_number || !owner_name || !owner_id) {
    return res.status(400).json({ status: 'ERROR', message: 'Faltan campos obligatorios' });
  }
  try {
    const result = await query(
      `INSERT INTO bank_accounts (bank_name, account_type, account_number, owner_name, owner_id, owner_email, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [bank_name, account_type, account_number, owner_name, owner_id, owner_email || null, is_active !== false]
    );
    res.status(201).json({ status: 'OK', bankAccount: result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: 'Error al crear cuenta bancaria', error: err.message });
  }
};

// Actualizar cuenta existente (Admin)
exports.updateBankAccount = async (req, res) => {
  const { id } = req.params;
  const { bank_name, account_type, account_number, owner_name, owner_id, owner_email, is_active } = req.body;
  if (!bank_name || !account_type || !account_number || !owner_name || !owner_id) {
    return res.status(400).json({ status: 'ERROR', message: 'Faltan campos obligatorios' });
  }
  try {
    const result = await query(
      `UPDATE bank_accounts
       SET bank_name = $1, account_type = $2, account_number = $3, owner_name = $4, owner_id = $5, owner_email = $6, is_active = $7, updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [bank_name, account_type, account_number, owner_name, owner_id, owner_email || null, is_active !== false, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'ERROR', message: 'Cuenta bancaria no encontrada' });
    }
    res.json({ status: 'OK', bankAccount: result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: 'Error al actualizar cuenta bancaria', error: err.message });
  }
};

// Eliminar cuenta bancaria (Admin)
exports.deleteBankAccount = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query('DELETE FROM bank_accounts WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'ERROR', message: 'Cuenta bancaria no encontrada' });
    }
    res.json({ status: 'OK', message: 'Cuenta bancaria eliminada con éxito' });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: 'Error al eliminar cuenta bancaria', error: err.message });
  }
};
