const bcrypt = require('bcryptjs');
const { query } = require('../config/db');

// Listar todos los usuarios del sistema de gestión (admin, staff, organizer)
exports.getAllUsers = async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.is_verified, u.token_tarjeta, u.debt_balance, 
              u.module_cartelera, u.module_logistics, u.workgroup_organizer_id, u.created_at,
              org.name as organizer_name
       FROM users u
       LEFT JOIN users org ON u.workgroup_organizer_id = org.id
       WHERE u.role IN ('admin', 'staff', 'organizer') 
       ORDER BY u.role, u.name ASC`
    );
    res.json({ status: 'OK', users: result.rows });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
};

// Crear nuevo usuario (Admin panel)
exports.createUser = async (req, res) => {
  const { name, email, phone, password, role, token_tarjeta, module_cartelera = true, module_logistics = false, workgroup_organizer_id } = req.body;
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
      'INSERT INTO users (name, email, phone, password_hash, role, is_verified, token_tarjeta, module_cartelera, module_logistics, workgroup_organizer_id) VALUES ($1,$2,$3,$4,$5,TRUE,$6,$7,$8,$9) RETURNING id, name, email, phone, role, is_verified, token_tarjeta, debt_balance, module_cartelera, module_logistics, workgroup_organizer_id, created_at',
      [name, email.toLowerCase().trim(), phone || null, hash, role, token_tarjeta || null, module_cartelera, module_logistics, workgroup_organizer_id || null]
    );
    res.status(201).json({ status: 'OK', message: 'Usuario creado exitosamente.', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
};

// Actualizar usuario (nombre, teléfono, rol, contraseña, token_tarjeta, módulos, organizador padre)
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, phone, role, password, token_tarjeta, module_cartelera, module_logistics, workgroup_organizer_id } = req.body;

  // Evitar que un admin se quite su propio rol
  if (req.user.id === id && role && role !== 'admin') {
    return res.status(400).json({ status: 'ERROR', message: 'No puedes cambiar tu propio rol.' });
  }

  try {
    const fields = [];
    const values = [];
    let i = 1;
    if (name)  { fields.push(`name=$${i++}`);          values.push(name.trim()); }
    if (phone !== undefined) { fields.push(`phone=$${i++}`); values.push(phone || null); }
    if (role && ['admin', 'staff', 'organizer'].includes(role)) {
                  fields.push(`role=$${i++}`);         values.push(role); }
    if (token_tarjeta !== undefined) {
                  fields.push(`token_tarjeta=$${i++}`); values.push(token_tarjeta); }
    if (module_cartelera !== undefined) {
                  fields.push(`module_cartelera=$${i++}`); values.push(Boolean(module_cartelera)); }
    if (module_logistics !== undefined) {
                  fields.push(`module_logistics=$${i++}`); values.push(Boolean(module_logistics)); }
    if (workgroup_organizer_id !== undefined) {
                  fields.push(`workgroup_organizer_id=$${i++}`); values.push(workgroup_organizer_id || null); }
    if (password && password.length >= 6) {
      const hash = await bcrypt.hash(password, 10);
                  fields.push(`password_hash=$${i++}`); values.push(hash);
    }
    if (fields.length === 0) {
      return res.status(400).json({ status: 'ERROR', message: 'Nada que actualizar.' });
    }
    values.push(id);
    const result = await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id=$${i} RETURNING id, name, email, phone, role, is_verified, token_tarjeta, debt_balance, module_cartelera, module_logistics, workgroup_organizer_id`,
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
          COALESCE(o.customer_name, 'Cliente') as name,
          COALESCE(MAX(o.customer_whatsapp), '') as phone,
          COUNT(DISTINCT o.id) as total_orders,
          COALESCE(SUM(COALESCE(o.ticket_count_adult, 0) + COALESCE(o.ticket_count_child, 0)), 0) as total_tickets,
          COALESCE(SUM(o.amount_total), 0) as total_spent,
          MAX(o.created_at) as last_purchase,
          COALESCE(STRING_AGG(DISTINCT e.title, ', '), '') as events_attended
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
          COALESCE(o.customer_name, 'Cliente') as name,
          COALESCE(MAX(o.customer_whatsapp), '') as phone,
          COUNT(DISTINCT o.id) as total_orders,
          COALESCE(SUM(COALESCE(o.ticket_count_adult, 0) + COALESCE(o.ticket_count_child, 0)), 0) as total_tickets,
          COALESCE(SUM(o.amount_total), 0) as total_spent,
          MAX(o.created_at) as last_purchase,
          COALESCE(STRING_AGG(DISTINCT e.title, ', '), '') as events_attended
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

// 8. Actualizar la tarjeta de garantía del propio organizador
exports.updateMyGuaranteeCard = async (req, res) => {
  try {
    const { token_tarjeta } = req.body;
    if (!token_tarjeta || token_tarjeta.trim().length < 4) {
      return res.status(400).json({
        status: 'ERROR',
        message: 'Debe ingresar un identificador de tarjeta o token de garantía válido.'
      });
    }

    const result = await query(
      'UPDATE users SET token_tarjeta = $1 WHERE id = $2 RETURNING id, name, email, role, token_tarjeta, debt_balance',
      [token_tarjeta.trim(), req.user.id]
    );

    res.json({
      status: 'OK',
      message: 'Tarjeta de garantía Payphone registrada exitosamente.',
      user: result.rows[0]
    });
  } catch (err) {
    console.error('Error al actualizar tarjeta de garantía:', err);
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
};

// Helper interno para restringir módulos de staff según el organizador padre
const resolveStaffModulesForOrganizer = async (reqUser, organizerId, module_cartelera, module_logistics) => {
  if (reqUser.role === 'admin') {
    return {
      cartelera: module_cartelera !== undefined ? Boolean(module_cartelera) : true,
      logistics: module_logistics !== undefined ? Boolean(module_logistics) : true,
    };
  }
  const orgRes = await query('SELECT module_cartelera, module_logistics FROM users WHERE id = $1', [organizerId]);
  const orgCartelera = orgRes.rows[0]?.module_cartelera ?? true;
  const orgLogistics = orgRes.rows[0]?.module_logistics ?? false;
  return {
    cartelera: orgCartelera && (module_cartelera !== undefined ? Boolean(module_cartelera) : true),
    logistics: orgLogistics && (module_logistics !== undefined ? Boolean(module_logistics) : true),
  };
};

// 9. Obtener el personal de Staff propio del Organizador (o todos si es Admin) + invitaciones pendientes
exports.getMyStaff = async (req, res) => {
  try {
    const organizerId = req.user.id;
    let staffRes;
    let invitesRes;

    if (req.user.role === 'admin') {
      staffRes = await query(
        `SELECT u.id, u.name, u.email, u.phone, 'staff' AS role,
                m.module_cartelera, m.module_logistics, m.organizer_id AS workgroup_organizer_id,
                m.created_at, org.name AS organizer_name, u.role AS user_base_role
         FROM staff_memberships m
         JOIN users u ON m.staff_user_id = u.id
         LEFT JOIN users org ON m.organizer_id = org.id
         WHERE m.status = 'active'
         ORDER BY u.name ASC`
      );
      invitesRes = await query(
        `SELECT inv.id, inv.organizer_id, inv.invitee_user_id, inv.module_cartelera, inv.module_logistics,
                inv.status, inv.message, inv.created_at,
                u.name AS invitee_name, u.email AS invitee_email, org.name AS organizer_name
         FROM staff_invitations inv
         JOIN users u ON inv.invitee_user_id = u.id
         LEFT JOIN users org ON inv.organizer_id = org.id
         WHERE inv.status = 'pending'
         ORDER BY inv.created_at DESC`
      );
    } else {
      staffRes = await query(
        `SELECT u.id, u.name, u.email, u.phone, 'staff' AS role,
                m.module_cartelera, m.module_logistics, m.organizer_id AS workgroup_organizer_id,
                m.created_at, u.role AS user_base_role
         FROM staff_memberships m
         JOIN users u ON m.staff_user_id = u.id
         WHERE m.organizer_id = $1 AND m.status = 'active'
         ORDER BY u.name ASC`,
        [organizerId]
      );
      invitesRes = await query(
        `SELECT inv.id, inv.organizer_id, inv.invitee_user_id, inv.module_cartelera, inv.module_logistics,
                inv.status, inv.message, inv.created_at,
                u.name AS invitee_name, u.email AS invitee_email
         FROM staff_invitations inv
         JOIN users u ON inv.invitee_user_id = u.id
         WHERE inv.organizer_id = $1 AND inv.status = 'pending'
         ORDER BY inv.created_at DESC`,
        [organizerId]
      );
    }

    res.json({
      status: 'OK',
      staff: staffRes.rows,
      pending_invitations: invitesRes.rows
    });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
};

// 9.1 Buscar usuarios existentes para invitar como Staff (Google/Facebook/Buyer/etc.)
exports.searchUsersForStaff = async (req, res) => {
  try {
    const organizerId = req.user.id;
    const q = (req.query.q || '').trim().toLowerCase();
    if (q.length < 2) {
      return res.json({ status: 'OK', users: [] });
    }
    const result = await query(
      `SELECT u.id, u.name, u.email, u.role,
              EXISTS(
                SELECT 1 FROM staff_memberships m
                WHERE m.organizer_id = $1 AND m.staff_user_id = u.id AND m.status = 'active'
              ) AS is_already_staff,
              EXISTS(
                SELECT 1 FROM staff_invitations inv
                WHERE inv.organizer_id = $1 AND inv.invitee_user_id = u.id AND inv.status = 'pending'
              ) AS has_pending_invite
       FROM users u
       WHERE u.id <> $1
         AND (LOWER(u.email) LIKE $2 OR LOWER(u.name) LIKE $2)
       ORDER BY u.name ASC
       LIMIT 15`,
      [organizerId, `%${q}%`]
    );
    res.json({ status: 'OK', users: result.rows });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
};

// 9.2 Enviar solicitud/invitación de Staff a un usuario existente
exports.inviteStaff = async (req, res) => {
  try {
    const organizerId = req.user.id;
    const { user_id, email, module_cartelera, module_logistics, message } = req.body;

    let targetUser = null;
    if (user_id) {
      const r = await query('SELECT id, name, email FROM users WHERE id = $1', [user_id]);
      targetUser = r.rows[0];
    } else if (email) {
      const r = await query('SELECT id, name, email FROM users WHERE LOWER(email) = $1', [email.toLowerCase().trim()]);
      targetUser = r.rows[0];
    }

    if (!targetUser) {
      return res.status(404).json({ status: 'ERROR', message: 'Usuario no encontrado con ese correo.' });
    }
    if (targetUser.id === organizerId) {
      return res.status(400).json({ status: 'ERROR', message: 'No puedes enviarte una invitación a ti mismo.' });
    }

    const existingMember = await query(
      `SELECT id FROM staff_memberships WHERE organizer_id = $1 AND staff_user_id = $2 AND status = 'active'`,
      [organizerId, targetUser.id]
    );
    if (existingMember.rows.length > 0) {
      return res.status(400).json({ status: 'ERROR', message: `${targetUser.name} ya forma parte de tu equipo de staff.` });
    }

    const existingInvite = await query(
      `SELECT id FROM staff_invitations WHERE organizer_id = $1 AND invitee_user_id = $2 AND status = 'pending'`,
      [organizerId, targetUser.id]
    );
    if (existingInvite.rows.length > 0) {
      return res.status(400).json({ status: 'ERROR', message: `Ya existe una solicitud pendiente para ${targetUser.name}.` });
    }

    const mods = await resolveStaffModulesForOrganizer(req.user, organizerId, module_cartelera, module_logistics);

    const invRes = await query(
      `INSERT INTO staff_invitations (organizer_id, invitee_user_id, module_cartelera, module_logistics, status, message)
       VALUES ($1, $2, $3, $4, 'pending', $5)
       RETURNING *`,
      [organizerId, targetUser.id, mods.cartelera, mods.logistics, message || null]
    );

    res.status(201).json({
      status: 'OK',
      message: `Solicitud enviada a ${targetUser.name} (${targetUser.email}).`,
      invitation: { ...invRes.rows[0], invitee_name: targetUser.name, invitee_email: targetUser.email }
    });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
};

// 9.3 Cancelar una invitación pendiente
exports.cancelStaffInvite = async (req, res) => {
  try {
    const { id } = req.params;
    const organizerId = req.user.id;
    const r = req.user.role === 'admin'
      ? await query(`UPDATE staff_invitations SET status = 'cancelled', responded_at = NOW() WHERE id = $1 AND status = 'pending'`, [id])
      : await query(`UPDATE staff_invitations SET status = 'cancelled', responded_at = NOW() WHERE id = $1 AND organizer_id = $2 AND status = 'pending'`, [id, organizerId]);

    if (r.rowCount === 0) {
      return res.status(404).json({ status: 'ERROR', message: 'Invitación no encontrada.' });
    }
    res.json({ status: 'OK', message: 'Invitación cancelada.' });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
};

// 9.4 Obtener mis invitaciones pendientes (para cualquier usuario autenticado)
exports.getMyInvitations = async (req, res) => {
  try {
    const result = await query(
      `SELECT inv.id, inv.organizer_id, inv.module_cartelera, inv.module_logistics, inv.status, inv.message, inv.created_at,
              org.name AS organizer_name, org.email AS organizer_email, org.theme_config AS organizer_theme
       FROM staff_invitations inv
       JOIN users org ON inv.organizer_id = org.id
       WHERE inv.invitee_user_id = $1 AND inv.status = 'pending'
       ORDER BY inv.created_at DESC`,
      [req.user.id]
    );
    res.json({ status: 'OK', invitations: result.rows });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
};

// 9.5 Aceptar o rechazar una invitación de Staff
exports.respondToInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'accept' | 'reject'
    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ status: 'ERROR', message: 'Acción inválida.' });
    }

    const invRes = await query(
      `SELECT * FROM staff_invitations WHERE id = $1 AND invitee_user_id = $2 AND status = 'pending'`,
      [id, req.user.id]
    );
    if (invRes.rows.length === 0) {
      return res.status(404).json({ status: 'ERROR', message: 'Invitación no encontrada o ya respondida.' });
    }

    const inv = invRes.rows[0];
    await query('BEGIN');

    if (action === 'accept') {
      await query(
        `INSERT INTO staff_memberships (organizer_id, staff_user_id, module_cartelera, module_logistics, status)
         VALUES ($1, $2, $3, $4, 'active')
         ON CONFLICT (organizer_id, staff_user_id) DO UPDATE
         SET module_cartelera = EXCLUDED.module_cartelera,
             module_logistics = EXCLUDED.module_logistics,
             status = 'active',
             updated_at = NOW()`,
        [inv.organizer_id, req.user.id, inv.module_cartelera, inv.module_logistics]
      );
      await query(
        `UPDATE staff_invitations SET status = 'accepted', responded_at = NOW() WHERE id = $1`,
        [id]
      );
    } else {
      await query(
        `UPDATE staff_invitations SET status = 'rejected', responded_at = NOW() WHERE id = $1`,
        [id]
      );
    }

    await query('COMMIT');
    res.json({
      status: 'OK',
      message: action === 'accept' ? '¡Te uniste al equipo de Staff!' : 'Invitación rechazada.'
    });
  } catch (err) {
    await query('ROLLBACK');
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
};

// 10. Crear nuevo personal de Staff subordinado al Organizador (desde 0)
exports.createMyStaff = async (req, res) => {
  try {
    const organizerId = req.user.id;
    const { name, email, phone, password, module_cartelera, module_logistics } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ status: 'ERROR', message: 'Nombre, correo y contraseña son obligatorios.' });
    }
    const cleanEmail = email.toLowerCase().trim();
    const exists = await query('SELECT id, name, email FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    if (exists.rows.length > 0) {
      return res.status(409).json({
        status: 'USER_EXISTS',
        message: 'Este correo ya tiene una cuenta registrada. Puedes enviarle una solicitud para unirse a tu staff.',
        existing_user: exists.rows[0]
      });
    }

    const mods = await resolveStaffModulesForOrganizer(req.user, organizerId, module_cartelera, module_logistics);
    const hash = await bcrypt.hash(password, 10);

    await query('BEGIN');
    const result = await query(
      `INSERT INTO users (name, email, phone, password_hash, role, is_verified, workgroup_organizer_id, module_logistics, module_cartelera)
       VALUES ($1, $2, $3, $4, 'staff', TRUE, $5, $6, $7)
       RETURNING id, name, email, phone, role, module_cartelera, module_logistics, workgroup_organizer_id, created_at`,
      [name.trim(), cleanEmail, phone || null, hash, organizerId, mods.logistics, mods.cartelera]
    );
    const newUser = result.rows[0];

    await query(
      `INSERT INTO staff_memberships (organizer_id, staff_user_id, module_cartelera, module_logistics, status)
       VALUES ($1, $2, $3, $4, 'active')
       ON CONFLICT (organizer_id, staff_user_id) DO NOTHING`,
      [organizerId, newUser.id, mods.cartelera, mods.logistics]
    );
    await query('COMMIT');

    res.status(201).json({ status: 'OK', message: 'Personal de Staff creado exitosamente.', staff: newUser });
  } catch (err) {
    await query('ROLLBACK');
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
};

// 10.1 Actualizar personal de Staff propio del Organizador (o Admin)
exports.updateMyStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const organizerId = req.user.id;
    const { name, phone, password, module_cartelera, module_logistics, target_organizer_id } = req.body;

    const effectiveOrgId = (req.user.role === 'admin' && target_organizer_id) ? target_organizer_id : organizerId;

    const checkMem = req.user.role === 'admin'
      ? await query(`SELECT m.*, u.role AS user_role FROM staff_memberships m JOIN users u ON m.staff_user_id = u.id WHERE m.staff_user_id = $1 AND m.status = 'active' LIMIT 1`, [id])
      : await query(`SELECT m.*, u.role AS user_role FROM staff_memberships m JOIN users u ON m.staff_user_id = u.id WHERE m.staff_user_id = $1 AND m.organizer_id = $2 AND m.status = 'active'`, [id, effectiveOrgId]);

    if (checkMem.rows.length === 0) {
      return res.status(404).json({ status: 'ERROR', message: 'Staff no encontrado o no pertenece a tu equipo.' });
    }

    const mem = checkMem.rows[0];
    const mods = await resolveStaffModulesForOrganizer(req.user, mem.organizer_id, module_cartelera, module_logistics);

    // Actualizar permisos en staff_memberships
    await query(
      `UPDATE staff_memberships
       SET module_cartelera = COALESCE($1, module_cartelera),
           module_logistics = COALESCE($2, module_logistics),
           updated_at = NOW()
       WHERE id = $3`,
      [
        module_cartelera !== undefined ? mods.cartelera : null,
        module_logistics !== undefined ? mods.logistics : null,
        mem.id
      ]
    );

    // Solo actualizar datos de perfil/contraseña en users si fue creado como staff local de este organizador
    if (mem.user_role === 'staff') {
      const fields = [];
      const values = [];
      let i = 1;
      if (name) { fields.push(`name=$${i++}`); values.push(name.trim()); }
      if (phone !== undefined) { fields.push(`phone=$${i++}`); values.push(phone || null); }
      if (password && password.length >= 6) {
        const hash = await bcrypt.hash(password, 10);
        fields.push(`password_hash=$${i++}`); values.push(hash);
      }
      if (module_cartelera !== undefined) { fields.push(`module_cartelera=$${i++}`); values.push(mods.cartelera); }
      if (module_logistics !== undefined) { fields.push(`module_logistics=$${i++}`); values.push(mods.logistics); }
      if (fields.length > 0) {
        values.push(id);
        await query(`UPDATE users SET ${fields.join(', ')} WHERE id=$${i}`, values);
      }
    }

    const updated = await query(
      `SELECT u.id, u.name, u.email, u.phone, 'staff' AS role,
              m.module_cartelera, m.module_logistics, m.organizer_id AS workgroup_organizer_id, m.created_at
       FROM staff_memberships m JOIN users u ON m.staff_user_id = u.id
       WHERE m.id = $1`,
      [mem.id]
    );

    res.json({ status: 'OK', message: 'Staff actualizado con éxito.', staff: updated.rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
};

// 11. Desvincular personal de Staff del equipo (sin destruir su cuenta personal Google/Facebook/Buyer)
exports.deleteMyStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const organizerId = req.user.id;
    let r;
    if (req.user.role === 'admin') {
      r = await query("DELETE FROM staff_memberships WHERE staff_user_id = $1", [id]);
      await query("UPDATE users SET workgroup_organizer_id = NULL WHERE id = $1 AND role = 'staff'", [id]);
    } else {
      r = await query("DELETE FROM staff_memberships WHERE staff_user_id = $1 AND organizer_id = $2", [id, organizerId]);
      await query("UPDATE users SET workgroup_organizer_id = NULL WHERE id = $1 AND workgroup_organizer_id = $2", [id, organizerId]);
    }
    if (r.rowCount === 0) {
      return res.status(404).json({ status: 'ERROR', message: 'Usuario no encontrado o no pertenece a tu equipo de trabajo.' });
    }
    res.json({ status: 'OK', message: 'Miembro desvinculado del equipo con éxito.' });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
};

// 12. Obtener configuración de marca blanca (Logo, slug, colores)
exports.getMyBrand = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await query(
      "SELECT id, name, email, tenant_slug, theme_config FROM users WHERE id = $1",
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'ERROR', message: 'Usuario no encontrado.' });
    }
    res.json({ status: 'OK', brand: result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
};

// 13. Actualizar configuración de marca blanca
exports.updateMyBrand = async (req, res) => {
  try {
    const userId = req.user.id;
    const { tenant_slug, theme_config, name } = req.body;
    let cleanSlug = tenant_slug ? tenant_slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') : null;
    if (cleanSlug) {
      const conflict = await query("SELECT id FROM users WHERE tenant_slug = $1 AND id != $2", [cleanSlug, userId]);
      if (conflict.rows.length > 0) {
        return res.status(400).json({ status: 'ERROR', message: 'Este identificador de enlace ya está en uso por otra marca.' });
      }
    }
    const result = await query(
      `UPDATE users 
       SET tenant_slug = COALESCE($1, tenant_slug), 
           theme_config = COALESCE($2, theme_config),
           name = COALESCE($3, name)
       WHERE id = $4
       RETURNING id, name, tenant_slug, theme_config`,
      [cleanSlug, theme_config ? JSON.stringify(theme_config) : null, name ? name.trim() : null, userId]
    );
    res.json({ status: 'OK', message: 'Configuración de marca actualizada exitosamente.', brand: result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
};

// 14. Obtener información pública de una marca (Tenant)
exports.getPublicTenant = async (req, res) => {
  try {
    const { slug } = req.params;
    const cleanSlug = slug.trim().toLowerCase();
    const result = await query(
      "SELECT id, name, tenant_slug, theme_config FROM users WHERE tenant_slug = $1",
      [cleanSlug]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'ERROR', message: 'Marca no encontrada.' });
    }
    res.json({ status: 'OK', tenant: result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
};
