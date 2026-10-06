const { query } = require('../config/db');

// Obtener todas las campañas
exports.getCampaigns = async (req, res) => {
  try {
    const result = await query('SELECT * FROM logistics_campaigns ORDER BY created_at DESC');
    res.json({ status: 'OK', data: result.rows });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', message: error.message });
  }
};

// Crear una nueva campaña
exports.createCampaign = async (req, res) => {
  const { name, description, total_items, form_schema, theme_config } = req.body;
  const organizer_id = req.user?.id || null;

  try {
    await query('BEGIN');

    // 1. Crear Campaña
    const campaignResult = await query(
      `INSERT INTO logistics_campaigns (organizer_id, name, description, total_items, form_schema, theme_config) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [organizer_id, name, description, total_items, JSON.stringify(form_schema || []), JSON.stringify(theme_config || {})]
    );
    const campaign = campaignResult.rows[0];

    // 2. Generar Items
    let itemsValues = [];
    for (let i = 1; i <= total_items; i++) {
      const code = String(i).padStart(3, '0'); // 001, 002...
      itemsValues.push(`('${campaign.id}', '${code}', 'AVAILABLE')`);
    }

    if (itemsValues.length > 0) {
      // Insertar por lotes (batch insert)
      await query(`INSERT INTO logistics_items (campaign_id, item_code, status) VALUES ${itemsValues.join(',')}`);
    }

    await query('COMMIT');
    res.status(201).json({ status: 'OK', data: campaign });
  } catch (error) {
    await query('ROLLBACK');
    res.status(500).json({ status: 'ERROR', message: error.message });
  }
};

// Asignar un lote de canastas (Despacho)
exports.dispatchItems = async (req, res) => {
  const { campaign_id, start_code, quantity, assigned_data } = req.body;
  const staff_id = req.user?.id || null;

  try {
    await query('BEGIN');

    // Buscar disponibles secuenciales a partir del start_code
    const itemsResult = await query(
      `SELECT id, item_code FROM logistics_items 
       WHERE campaign_id = $1 AND status = 'AVAILABLE' AND item_code >= $2 
       ORDER BY item_code ASC LIMIT $3`,
      [campaign_id, start_code, quantity]
    );

    if (itemsResult.rows.length < quantity) {
      await query('ROLLBACK');
      return res.status(400).json({ 
        status: 'ERROR', 
        message: `Solo se encontraron ${itemsResult.rows.length} códigos disponibles consecutivos.` 
      });
    }

    const idsToUpdate = itemsResult.rows.map(row => row.id);

    // Actualizar estado
    await query(
      `UPDATE logistics_items 
       SET status = 'DISPATCHED', assigned_data = $1, dispatched_at = NOW(), dispatched_by = $2 
       WHERE id = ANY($3::uuid[])`,
      [JSON.stringify(assigned_data), staff_id, idsToUpdate]
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

// Validar Recepción de un código
exports.receiveItem = async (req, res) => {
  const { item_code, campaign_id } = req.body;
  const staff_id = req.user?.id || null;

  try {
    const itemResult = await query(
      `SELECT * FROM logistics_items WHERE campaign_id = $1 AND item_code = $2`,
      [campaign_id, item_code]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ status: 'ERROR', message: 'Código no encontrado en esta campaña.' });
    }

    const item = itemResult.rows[0];

    if (item.status === 'RECEIVED') {
      return res.status(400).json({ status: 'ERROR', message: 'Este código ya ha sido validado/recibido anteriormente.' });
    }
    if (item.status === 'AVAILABLE') {
      return res.status(400).json({ status: 'ERROR', message: 'Este código aún no ha sido asignado a nadie.' });
    }

    // Actualizar
    await query(
      `UPDATE logistics_items SET status = 'RECEIVED', received_at = NOW(), received_by = $1 WHERE id = $2`,
      [staff_id, item.id]
    );

    res.json({ status: 'OK', message: 'Recepción validada exitosamente.', data: item.assigned_data });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', message: error.message });
  }
};

// Obtener métricas de la campaña (Para el Dashboard y Belén)
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
