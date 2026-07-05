const { query } = require('../config/db');

// Listar todas las promociones/banners (admin)
exports.getAllPromotions = async (req, res) => {
  try {
    const result = await query('SELECT * FROM promotions ORDER BY created_at DESC');
    res.json({ status: 'OK', promotions: result.rows });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: 'Error al obtener banners', error: err.message });
  }
};

// Listar solo el banner activo (público - para la cartelera)
exports.getActivePromotion = async (req, res) => {
  try {
    const now = new Date();
    const result = await query(
      `SELECT * FROM promotions 
       WHERE active = true 
         AND (start_date IS NULL OR start_date <= $1)
         AND (end_date IS NULL OR end_date >= $1)
       ORDER BY created_at DESC 
       LIMIT 1`,
      [now]
    );
    res.json({ status: 'OK', promotion: result.rows[0] || null });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: 'Error al obtener banner activo', error: err.message });
  }
};

// Crear nuevo banner
exports.createPromotion = async (req, res) => {
  const { title, subtitle, image_url, link_url, active, start_date, end_date } = req.body;
  if (!title) {
    return res.status(400).json({ status: 'ERROR', message: 'El título del banner es obligatorio.' });
  }
  try {
    const result = await query(
      `INSERT INTO promotions (title, subtitle, image_url, link_url, active, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, subtitle || null, image_url || null, link_url || null, active || false, start_date || null, end_date || null]
    );
    res.status(201).json({ status: 'OK', promotion: result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: 'Error al crear banner', error: err.message });
  }
};

// Actualizar banner
exports.updatePromotion = async (req, res) => {
  const { id } = req.params;
  const { title, subtitle, image_url, link_url, active, start_date, end_date } = req.body;
  try {
    const result = await query(
      `UPDATE promotions SET title=$1, subtitle=$2, image_url=$3, link_url=$4, active=$5,
       start_date=$6, end_date=$7, updated_at=NOW() WHERE id=$8 RETURNING *`,
      [title, subtitle || null, image_url || null, link_url || null, active || false, start_date || null, end_date || null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ status: 'ERROR', message: 'Banner no encontrado.' });
    res.json({ status: 'OK', promotion: result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: 'Error al actualizar banner', error: err.message });
  }
};

// Activar/desactivar banner
exports.togglePromotion = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(
      'UPDATE promotions SET active = NOT active, updated_at = NOW() WHERE id = $1 RETURNING *', [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ status: 'ERROR', message: 'Banner no encontrado.' });
    res.json({ status: 'OK', promotion: result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: 'Error al cambiar estado', error: err.message });
  }
};

// Eliminar banner
exports.deletePromotion = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query('DELETE FROM promotions WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ status: 'ERROR', message: 'Banner no encontrado.' });
    res.json({ status: 'OK', message: 'Banner eliminado.' });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: 'Error al eliminar banner', error: err.message });
  }
};
