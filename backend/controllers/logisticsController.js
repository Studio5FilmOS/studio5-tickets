const { query } = require('../config/db');

// Obtener todas las campañas con métricas en tiempo real
exports.getCampaigns = async (req, res) => {
  const user = req.user;
  try {
    let sql = `
      SELECT 
        c.*,
        u.name as organizer_name,
        COUNT(i.id) FILTER (WHERE i.status = 'AVAILABLE') as available_count,
        COUNT(i.id) FILTER (WHERE i.status = 'DISPATCHED') as dispatched_count,
        COUNT(i.id) FILTER (WHERE i.status = 'RECEIVED') as received_count,
        COUNT(i.id) as total_items_count
      FROM logistics_campaigns c
      LEFT JOIN users u ON c.organizer_id = u.id
      LEFT JOIN logistics_items i ON c.id = i.campaign_id
    `;
    const params = [];

    // Si es organizador (no admin), sólo ver sus propias campañas
    if (user && user.role === 'organizer') {
      sql += ' WHERE c.organizer_id = $1';
      params.push(user.id);
    }

    sql += ' GROUP BY c.id, u.name ORDER BY c.created_at DESC';

    const result = await query(sql, params);
    res.json({ status: 'OK', data: result.rows });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', message: error.message });
  }
};

// Obtener detalle de una campaña
exports.getCampaignById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(
      `SELECT c.*, u.name as organizer_name 
       FROM logistics_campaigns c
       LEFT JOIN users u ON c.organizer_id = u.id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'ERROR', message: 'Campaña no encontrada.' });
    }

    // Obtener staff asignado
    const staffRes = await query(
      `SELECT u.id, u.name, u.email, u.phone 
       FROM logistics_staff_assignments a
       JOIN users u ON a.staff_id = u.id
       WHERE a.campaign_id = $1`,
      [id]
    );

    res.json({ 
      status: 'OK', 
      data: { 
        ...result.rows[0], 
        assigned_staff: staffRes.rows 
      } 
    });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', message: error.message });
  }
};

// Crear una nueva campaña
exports.createCampaign = async (req, res) => {
  const { name, description, total_items = 100, items_breakdown = [], form_schema = [], theme_config = {} } = req.body;
  const organizer_id = req.user?.id || null;

  try {
    await query('BEGIN');

    // 1. Crear Campaña
    const campaignResult = await query(
      `INSERT INTO logistics_campaigns (organizer_id, name, description, total_items, items_breakdown, form_schema, theme_config) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        organizer_id, 
        name, 
        description, 
        parseInt(total_items, 10), 
        JSON.stringify(items_breakdown || []), 
        JSON.stringify(form_schema || []), 
        JSON.stringify(theme_config || { primaryColor: '#DEB841', tenantName: 'Studio 5' })
      ]
    );
    const campaign = campaignResult.rows[0];

    // 2. Generar Items secuenciales (Ej: 001, 002... o código con prefijo)
    const count = parseInt(total_items, 10);
    const batchSize = 500;
    for (let start = 1; start <= count; start += batchSize) {
      const end = Math.min(start + batchSize - 1, count);
      let itemsValues = [];
      for (let i = start; i <= end; i++) {
        const code = String(i).padStart(4, '0'); // 0001, 0002...
        itemsValues.push(`('${campaign.id}', '${code}', 'AVAILABLE')`);
      }
      if (itemsValues.length > 0) {
        await query(`INSERT INTO logistics_items (campaign_id, item_code, status) VALUES ${itemsValues.join(',')}`);
      }
    }

    await query('COMMIT');
    res.status(201).json({ status: 'OK', data: campaign });
  } catch (error) {
    await query('ROLLBACK');
    res.status(500).json({ status: 'ERROR', message: error.message });
  }
};

// Eliminar campaña
exports.deleteCampaign = async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM logistics_campaigns WHERE id = $1', [id]);
    res.json({ status: 'OK', message: 'Campaña eliminada correctamente.' });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', message: error.message });
  }
};

// Obtener items/tickets de una campaña (para imprimir stickers o listado)
exports.getCampaignItems = async (req, res) => {
  const { campaign_id } = req.params;
  const { status, limit = 1000, offset = 0 } = req.query;

  try {
    let sql = 'SELECT * FROM logistics_items WHERE campaign_id = $1';
    const params = [campaign_id];

    if (status) {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    sql += ` ORDER BY item_code ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const result = await query(sql, params);
    const totalCountRes = await query('SELECT COUNT(*) FROM logistics_items WHERE campaign_id = $1', [campaign_id]);

    res.json({ 
      status: 'OK', 
      data: result.rows,
      total: parseInt(totalCountRes.rows[0].count, 10)
    });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', message: error.message });
  }
};

// Asignar personal (Staff) a una campaña
exports.assignStaff = async (req, res) => {
  const { campaign_id } = req.params;
  const { staff_ids } = req.body; // Array de IDs de usuarios staff

  try {
    await query('BEGIN');
    await query('DELETE FROM logistics_staff_assignments WHERE campaign_id = $1', [campaign_id]);

    if (Array.isArray(staff_ids) && staff_ids.length > 0) {
      const values = staff_ids.map(sid => `('${campaign_id}', '${sid}')`).join(',');
      await query(`INSERT INTO logistics_staff_assignments (campaign_id, staff_id) VALUES ${values}`);
    }

    await query('COMMIT');
    res.json({ status: 'OK', message: 'Personal asignado correctamente.' });
  } catch (error) {
    await query('ROLLBACK');
    res.status(500).json({ status: 'ERROR', message: error.message });
  }
};

// Obtener campañas asignadas al staff actual
exports.getStaffCampaigns = async (req, res) => {
  const userId = req.user?.id;
  try {
    let sql;
    let params = [];

    // Admin u Organizador pueden ver todas las activas
    if (req.user?.role === 'admin') {
      sql = `SELECT * FROM logistics_campaigns WHERE status = 'active' ORDER BY created_at DESC`;
    } else if (req.user?.role === 'organizer') {
      sql = `SELECT * FROM logistics_campaigns WHERE organizer_id = $1 AND status = 'active' ORDER BY created_at DESC`;
      params = [userId];
    } else {
      // Staff regular: solo campañas a las que fue explícitamente asignado
      sql = `
        SELECT c.* 
        FROM logistics_campaigns c
        JOIN logistics_staff_assignments a ON c.id = a.campaign_id
        WHERE a.staff_id = $1 AND c.status = 'active'
        ORDER BY c.created_at DESC
      `;
      params = [userId];
    }

    const result = await query(sql, params);
    res.json({ status: 'OK', data: result.rows });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', message: error.message });
  }
};

// Asignar un lote de canastas / tickets (Registro o Despacho)
exports.dispatchItems = async (req, res) => {
  const { campaign_id, start_code, quantity = 1, assigned_data } = req.body;
  const staff_id = req.user?.id || null;

  try {
    await query('BEGIN');

    // Buscar disponibles secuenciales a partir de start_code
    const itemsResult = await query(
      `SELECT id, item_code FROM logistics_items 
       WHERE campaign_id = $1 AND status = 'AVAILABLE' AND item_code >= $2 
       ORDER BY item_code ASC LIMIT $3`,
      [campaign_id, start_code, parseInt(quantity, 10)]
    );

    if (itemsResult.rows.length < parseInt(quantity, 10)) {
      await query('ROLLBACK');
      return res.status(400).json({ 
        status: 'ERROR', 
        message: `Solo se encontraron ${itemsResult.rows.length} códigos consecutivos disponibles.` 
      });
    }

    const idsToUpdate = itemsResult.rows.map(row => row.id);

    // Actualizar estado a DISPATCHED
    await query(
      `UPDATE logistics_items 
       SET status = 'DISPATCHED', assigned_data = $1, dispatched_at = NOW(), dispatched_by = $2 
       WHERE id = ANY($3::uuid[])`,
      [JSON.stringify(assigned_data || {}), staff_id, idsToUpdate]
    );

    await query('COMMIT');
    res.json({ 
      status: 'OK', 
      message: `Asignados ${quantity} items exitosamente.`,
      dispatched_range: `${itemsResult.rows[0].item_code} al ${itemsResult.rows[itemsResult.rows.length - 1].item_code}`
    });
  } catch (error) {
    await query('ROLLBACK');
    res.status(500).json({ status: 'ERROR', message: error.message });
  }
};

// Validar Recepción / Canje de un código
exports.receiveItem = async (req, res) => {
  const { item_code, campaign_id } = req.body;
  const staff_id = req.user?.id || null;

  try {
    const itemResult = await query(
      `SELECT i.*, c.name as campaign_name, c.items_breakdown 
       FROM logistics_items i
       JOIN logistics_campaigns c ON i.campaign_id = c.id
       WHERE i.campaign_id = $1 AND i.item_code = $2`,
      [campaign_id, item_code]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ status: 'ERROR', message: 'Código no encontrado en esta campaña.' });
    }

    const item = itemResult.rows[0];

    if (item.status === 'RECEIVED') {
      return res.status(400).json({ 
        status: 'ALREADY_RECEIVED', 
        message: '⚠️ Este código ya fue validado y entregado anteriormente.',
        received_at: item.received_at,
        assigned_data: item.assigned_data,
        items_breakdown: item.items_breakdown
      });
    }

    // Actualizar estado a RECEIVED
    await query(
      `UPDATE logistics_items 
       SET status = 'RECEIVED', received_at = NOW(), received_by = $1 
       WHERE id = $2`,
      [staff_id, item.id]
    );

    res.json({ 
      status: 'OK', 
      message: '¡Recepción y entrega validada exitosamente!', 
      data: item.assigned_data,
      items_breakdown: item.items_breakdown
    });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', message: error.message });
  }
};

// Obtener métricas de la campaña
exports.getMetrics = async (req, res) => {
  const { campaign_id } = req.params;

  try {
    const statsResult = await query(
      `SELECT status, COUNT(*) as count FROM logistics_items WHERE campaign_id = $1 GROUP BY status`,
      [campaign_id]
    );

    const metrics = { AVAILABLE: 0, DISPATCHED: 0, RECEIVED: 0, TOTAL: 0 };
    statsResult.rows.forEach(row => {
      metrics[row.status] = parseInt(row.count, 10);
      metrics.TOTAL += parseInt(row.count, 10);
    });

    res.json({ status: 'OK', data: metrics });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', message: error.message });
  }
};
