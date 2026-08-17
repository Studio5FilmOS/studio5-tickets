const bcrypt = require('bcryptjs');
const { query } = require('../config/db');

// Listar todos los usuarios del sistema de gestión (admin, staff, organizer)
exports.getAllUsers = async (req, res) => {
  try {
    const result = await query(
      "SELECT id, name, email, phone, role, is_verified, token_tarjeta, debt_balance, created_at FROM users WHERE role IN ('admin', 'staff', 'organizer') ORDER BY role, name ASC"
    );
    res.json({ status: 'OK', users: result.rows });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
};

// Crear nuevo usuario (Admin panel)
exports.createUser = async (req, res) => {
  const { name, email, phone, password, role, token_tarjeta } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ status: 'ERROR', message: 'Nombre, correo, contraseña y rol son obligatorios.' });
  }
  if (!['admin', 'staff', 'organizer'].includes(role)) {
    return res.status(400).json({ status: 'ERROR', message: 'El rol debe ser admin, staff u organizer.' });
  }
  try {
    const exists = await query('SELECT id FROM users WHERE LOWER(email)=LOWER($1)', [email]);
    if (exists.rows.length > 0) {
      return res.status(400).json({ status: 'ERROR', message: 'El correo ya está registrado.' });
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO users (name, email, phone, password_hash, role, is_verified, token_tarjeta) VALUES ($1,$2,$3,$4,$5,TRUE,$6) RETURNING id, name, email, phone, role, is_verified, token_tarjeta, debt_balance, created_at',
      [name, email.toLowerCase().trim(), phone || null, hash, role, token_tarjeta || null]
    );
    res.status(201).json({ status: 'OK', message: 'Usuario creado exitosamente.', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
};

// Actualizar usuario (nombre, teléfono, rol, contraseña, token_tarjeta)
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, phone, role, password, token_tarjeta } = req.body;

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
    if (role && ['admin', 'staff', 'organizer'].includes(role)) {
                  fields.push(`role=$${i++}`);         values.push(role); }
    if (token_tarjeta !== undefined) {
                  fields.push(`token_tarjeta=$${i++}`); values.push(token_tarjeta); }
    if (password && password.length >= 6) {
      const hash = await bcrypt.hash(password, 10);
                  fields.push(`password_hash=$${i++}`); values.push(hash);
    }
    if (fields.length === 0) {
      return res.status(400).json({ status: 'ERROR', message: 'Nada que actualizar.' });
    }
    values.push(id);
    const result = await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id=$${i} RETURNING id, name, email, phone, role, is_verified, token_tarjeta, debt_balance`,
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
    const result = await query('DELETE FROM users WHERE id=$1 AND role IN (\'admin\',\'staff\',\'organizer\') RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'ERROR', message: 'Usuario no encontrado.' });
    }
    res.json({ status: 'OK', message: 'Usuario eliminado.' });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
};

// 5. Portal del Cliente: Obtener mis tickets y compras (Para el usuario logueado)
exports.getMyTickets = async (req, res) => {
  try {
    const userEmail = req.user.email.toLowerCase().trim();
    const userId = req.user.id;

    // Buscar todas las órdenes del cliente (asociadas por buyer_id o por email de cliente)
    const ordersRes = await query(
      `SELECT o.id, o.order_num, o.amount_total, o.payment_status, o.payment_method, o.created_at,
              e.id as event_id, e.title as event_title, e.venue as event_venue, e.banner_url, e.ticket_template_url,
              es.id as schedule_id, es.schedule_time
       FROM orders o
       JOIN events e ON e.id = o.event_id
       JOIN event_schedules es ON es.id = o.schedule_id
       WHERE (o.buyer_id = $1 OR LOWER(o.customer_email) = $2)
         AND o.payment_status != 'Anulado'
       ORDER BY es.schedule_time DESC, o.created_at DESC`,
      [userId, userEmail]
    );

    const ordersWithTickets = [];

    for (let order of ordersRes.rows) {
      const ticketsRes = await query(
        `SELECT t.id, t.ticket_code, t.ticket_type, t.seat_label, t.status, l.nombre as localidad_nombre, l.color as localidad_color
         FROM tickets t
         LEFT JOIN localidades l ON l.id = t.localidad_id
         WHERE t.order_id = $1
         ORDER BY t.id ASC`,
        [order.id]
      );

      ordersWithTickets.push({
        ...order,
        tickets: ticketsRes.rows
      });
    }

    res.json({
      status: 'OK',
      orders: ordersWithTickets
    });
  } catch (err) {
    console.error('Error al obtener mis tickets:', err);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al obtener tus boletos.',
      error: err.message
    });
  }
};

// 6. Base de Datos de Clientes y CRM (Para Administradores y Organizadores)
exports.getCustomerDatabase = async (req, res) => {
  try {
    const isOrganizer = req.user.role === 'organizer';
    const organizerId = req.user.id;

    let customerQuery;
    let queryParams = [];

    if (isOrganizer) {
      // Clientes que han comprado en eventos de este organizador
      customerQuery = `
        SELECT 
          o.customer_email as email,
          o.customer_name as name,
          MAX(o.customer_whatsapp) as phone,
          COUNT(DISTINCT o.id) as total_orders,
          SUM(o.ticket_count_adult + o.ticket_count_child) as total_tickets,
          SUM(o.amount_total) as total_spent,
          MAX(o.created_at) as last_purchase,
          STRING_AGG(DISTINCT e.title, ', ') as events_attended
        FROM orders o
        JOIN events e ON e.id = o.event_id
        WHERE e.organizer_id = $1 AND o.payment_status != 'Anulado' AND o.customer_email IS NOT NULL
        GROUP BY o.customer_email, o.customer_name
        ORDER BY total_spent DESC
      `;
      queryParams = [organizerId];
    } else {
      // Base de datos global de todos los compradores (Para Dueños Generales / Admin)
      customerQuery = `
        SELECT 
          o.customer_email as email,
          o.customer_name as name,
          MAX(o.customer_whatsapp) as phone,
          COUNT(DISTINCT o.id) as total_orders,
          SUM(o.ticket_count_adult + o.ticket_count_child) as total_tickets,
          SUM(o.amount_total) as total_spent,
          MAX(o.created_at) as last_purchase,
          STRING_AGG(DISTINCT e.title, ', ') as events_attended
        FROM orders o
        JOIN events e ON e.id = o.event_id
        WHERE o.payment_status != 'Anulado' AND o.customer_email IS NOT NULL
        GROUP BY o.customer_email, o.customer_name
        ORDER BY total_spent DESC
      `;
    }

    const result = await query(customerQuery, queryParams);

    res.json({
      status: 'OK',
      customers: result.rows
    });
  } catch (err) {
    console.error('Error al obtener base de datos de clientes:', err);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al consultar la base de datos de clientes.',
      error: err.message
    });
  }
};

// 7. Métricas de Comisiones y Control de Organizadores de Marca Blanca (Solo para Dueños Generales / Admin)
exports.getOrganizersCommissionMetrics = async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.phone, 
        u.token_tarjeta, 
        u.debt_balance, 
        u.created_at,
        COUNT(DISTINCT e.id) as total_events,
        COALESCE(SUM(CASE WHEN o.payment_status = 'Pagado' THEN (o.ticket_count_adult + o.ticket_count_child) ELSE 0 END), 0) as total_paid_tickets,
        COALESCE(SUM(CASE WHEN o.payment_status = 'Pagado' THEN (o.ticket_count_adult + o.ticket_count_child) * 0.50 ELSE 0 END), 0) as total_commission_generated,
        COALESCE(SUM(CASE WHEN o.payment_status = 'Pagado' THEN o.amount_total ELSE 0 END), 0) as total_box_office_gross
      FROM users u
      LEFT JOIN events e ON e.organizer_id = u.id
      LEFT JOIN orders o ON o.event_id = e.id AND o.payment_status != 'Anulado'
      WHERE u.role = 'organizer'
      GROUP BY u.id, u.name, u.email, u.phone, u.token_tarjeta, u.debt_balance, u.created_at
      ORDER BY total_commission_generated DESC, u.name ASC
    `);

    res.json({
      status: 'OK',
      organizers: result.rows
    });
  } catch (err) {
    console.error('Error al obtener comisiones de organizadores:', err);
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
};
