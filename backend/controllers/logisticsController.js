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

    // Obtener staff asignado con lotes
    const staffRes = await query(
      `SELECT u.id, u.name, u.email, u.phone, a.batch_start_code, a.batch_end_code, a.quantity_assigned 
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

// Asignar personal (Staff) a una campaña con soporte de lotes asignados
exports.assignStaff = async (req, res) => {
  const { campaign_id } = req.params;
  const { staff_ids, assignments } = req.body; 

  try {
    await query('BEGIN');
    await query('DELETE FROM logistics_staff_assignments WHERE campaign_id = $1', [campaign_id]);

    if (Array.isArray(assignments) && assignments.length > 0) {
      for (const a of assignments) {
        if (!a.staff_id) continue;
        await query(
          `INSERT INTO logistics_staff_assignments 
           (campaign_id, staff_id, batch_start_code, batch_end_code, quantity_assigned) 
           VALUES ($1, $2, $3, $4, $5)`,
          [
            campaign_id, 
            a.staff_id, 
            a.batch_start_code || null, 
            a.batch_end_code || null, 
            parseInt(a.quantity_assigned, 10) || 0
          ]
        );
      }
    } else if (Array.isArray(staff_ids) && staff_ids.length > 0) {
      const values = staff_ids.map(sid => `('${campaign_id}', '${sid}')`).join(',');
      await query(`INSERT INTO logistics_staff_assignments (campaign_id, staff_id) VALUES ${values}`);
    }

    await query('COMMIT');
    res.json({ status: 'OK', message: 'Personal y lotes asignados correctamente.' });
  } catch (error) {
    await query('ROLLBACK');
    res.status(500).json({ status: 'ERROR', message: error.message });
  }
};

// Consultar estado de un código/ticket para el escáner flotante
exports.lookupItem = async (req, res) => {
  const { campaign_id, item_code } = req.query;
  if (!campaign_id || !item_code) {
    return res.status(400).json({ status: 'ERROR', message: 'campaign_id e item_code son requeridos.' });
  }

  try {
    const rawCode = item_code.trim();
    const padded = rawCode.padStart(4, '0');

    const result = await query(
      `SELECT i.*, c.name as campaign_name, c.items_breakdown 
       FROM logistics_items i
       JOIN logistics_campaigns c ON i.campaign_id = c.id
       WHERE i.campaign_id = $1 AND (i.item_code = $2 OR i.item_code = $3)`,
      [campaign_id, rawCode, padded]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        status: 'ERROR', 
        message: `El código #${rawCode} no existe en esta campaña.` 
      });
    }

    const item = result.rows[0];
    const assignedQty = item.assigned_data?.cantidad ? parseInt(item.assigned_data.cantidad, 10) : 1;
    const deliveredQty = parseInt(item.delivered_quantity || (item.status === 'RECEIVED' ? assignedQty : 0), 10);

    res.json({
      status: 'OK',
      item: {
        id: item.id,
        item_code: item.item_code,
        status: item.status, // AVAILABLE, DISPATCHED, RECEIVED
        assigned_data: item.assigned_data || null,
        total_quantity: assignedQty,
        delivered_quantity: deliveredQty,
        pending_quantity: Math.max(0, assignedQty - deliveredQty),
        dispatched_at: item.dispatched_at,
        received_at: item.received_at,
        campaign_name: item.campaign_name,
        items_breakdown: item.items_breakdown || []
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', message: error.message });
  }
};

// Obtener campañas asignadas al staff actual
exports.getStaffCampaigns = async (req, res) => {
  const userId = req.user?.id;
  try {
    let sql;
    let params = [];

    // Admin u Organizador pueden ver sus activas
    if (req.user?.role === 'admin') {
      sql = `SELECT * FROM logistics_campaigns WHERE status = 'active' ORDER BY created_at DESC`;
    } else if (req.user?.role === 'organizer') {
      sql = `SELECT * FROM logistics_campaigns WHERE organizer_id = $1 AND status = 'active' ORDER BY created_at DESC`;
      params = [userId];
    } else {
      // Staff regular: campañas a las que fue asignado (con info de su lote si existe)
      sql = `
        SELECT c.*, a.batch_start_code, a.batch_end_code, a.quantity_assigned 
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
  const { campaign_id, start_code, quantity = 1, assigned_data, immediate_delivery = false } = req.body;
  const staff_id = req.user?.id || null;
  const countToAssign = Math.max(1, parseInt(quantity, 10));

  try {
    await query('BEGIN');

    const cleanStart = start_code.trim().padStart(4, '0');

    // Buscar disponibles secuenciales a partir de start_code
    const itemsResult = await query(
      `SELECT id, item_code FROM logistics_items 
       WHERE campaign_id = $1 AND status = 'AVAILABLE' AND item_code >= $2 
       ORDER BY item_code ASC LIMIT $3`,
      [campaign_id, cleanStart, countToAssign]
    );

    if (itemsResult.rows.length < countToAssign) {
      await query('ROLLBACK');
      return res.status(400).json({ 
        status: 'ERROR', 
        message: `Solo se encontraron ${itemsResult.rows.length} códigos consecutivos disponibles.` 
      });
    }

    const idsToUpdate = itemsResult.rows.map(row => row.id);
    const batchCodes = itemsResult.rows.map(row => row.item_code);

    const mergedData = {
      ...(assigned_data || {}),
      cantidad: countToAssign,
      batch_codes: batchCodes
    };

    const targetStatus = immediate_delivery ? 'RECEIVED' : 'DISPATCHED';
    const deliveredQty = immediate_delivery ? countToAssign : 0;

    await query(
      `UPDATE logistics_items 
       SET status = $1, 
           assigned_data = $2, 
           delivered_quantity = $3,
           dispatched_at = NOW(), 
           dispatched_by = $4,
           received_at = CASE WHEN $5 THEN NOW() ELSE received_at END,
           received_by = CASE WHEN $5 THEN $4 ELSE received_by END
       WHERE id = ANY($6::uuid[])`,
      [targetStatus, JSON.stringify(mergedData), deliveredQty, staff_id, immediate_delivery, idsToUpdate]
    );

    await query('COMMIT');
    res.json({ 
      status: 'OK', 
      message: immediate_delivery 
        ? `Asignados y entregados ${countToAssign} artículos exitosamente.`
        : `Asignados ${countToAssign} artículos exitosamente al lote.`,
      dispatched_range: `${batchCodes[0]} al ${batchCodes[batchCodes.length - 1]}`,
      batch_codes: batchCodes
    });
  } catch (error) {
    await query('ROLLBACK');
    res.status(500).json({ status: 'ERROR', message: error.message });
  }
};

// Validar Recepción / Canje de un código con selector de cantidad
exports.receiveItem = async (req, res) => {
  const { item_code, campaign_id, quantity_to_deliver = 1 } = req.body;
  const staff_id = req.user?.id || null;

  try {
    const rawCode = item_code.trim();
    const padded = rawCode.padStart(4, '0');

    const itemResult = await query(
      `SELECT i.*, c.name as campaign_name, c.items_breakdown 
       FROM logistics_items i
       JOIN logistics_campaigns c ON i.campaign_id = c.id
       WHERE i.campaign_id = $1 AND (i.item_code = $2 OR i.item_code = $3)`,
      [campaign_id, rawCode, padded]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ status: 'ERROR', message: 'Código no encontrado en esta campaña.' });
    }

    const item = itemResult.rows[0];
    const totalAssigned = item.assigned_data?.cantidad ? parseInt(item.assigned_data.cantidad, 10) : 1;
    const currentDelivered = parseInt(item.delivered_quantity || (item.status === 'RECEIVED' ? totalAssigned : 0), 10);

    if (currentDelivered >= totalAssigned && item.status === 'RECEIVED') {
      return res.status(400).json({ 
        status: 'ALREADY_RECEIVED', 
        message: '⚠️ Este código ya fue validado y entregado en su totalidad anteriormente.',
        received_at: item.received_at,
        assigned_data: item.assigned_data,
        total_quantity: totalAssigned,
        delivered_quantity: currentDelivered,
        items_breakdown: item.items_breakdown
      });
    }

    const toDeliver = Math.max(1, parseInt(quantity_to_deliver, 10));
    const newDelivered = Math.min(totalAssigned, currentDelivered + toDeliver);
    const isCompleted = newDelivered >= totalAssigned;
    const newStatus = isCompleted ? 'RECEIVED' : 'DISPATCHED';

    await query(
      `UPDATE logistics_items 
       SET status = $1, delivered_quantity = $2, received_at = NOW(), received_by = $3 
       WHERE id = $4`,
      [newStatus, newDelivered, staff_id, item.id]
    );

    // Si tiene items agrupados en batch_codes, sincronizar estado del lote
    if (item.assigned_data?.batch_codes && Array.isArray(item.assigned_data.batch_codes) && isCompleted) {
      await query(
        `UPDATE logistics_items 
         SET status = 'RECEIVED', delivered_quantity = 1, received_at = NOW(), received_by = $1 
         WHERE campaign_id = $2 AND item_code = ANY($3::varchar[])`,
        [staff_id, campaign_id, item.assigned_data.batch_codes]
      );
    }

    res.json({ 
      status: 'OK', 
      message: isCompleted 
        ? '¡Entrega total completada exitosamente!' 
        : `Entrega parcial registrada: ${newDelivered} de ${totalAssigned}.`, 
      delivered_now: toDeliver,
      total_delivered: newDelivered,
      total_assigned: totalAssigned,
      is_completed: isCompleted,
      assigned_data: item.assigned_data,
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
