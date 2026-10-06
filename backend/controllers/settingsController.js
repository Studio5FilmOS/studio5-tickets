const { query } = require('../config/db');

// Obtener todas las configuraciones (Admin / Uso interno)
exports.getSettings = async (req, res) => {
  try {
    const result = await query('SELECT key, value FROM platform_settings');
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    res.json({ status: 'OK', settings });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
};

// Obtener configuraciones públicas (número de WhatsApp de contacto y mensajes)
exports.getPublicSettings = async (req, res) => {
  try {
    const result = await query(
      "SELECT key, value FROM platform_settings WHERE key IN ('contact_whatsapp', 'cartelera_contact_message', 'logistics_contact_message')"
    );
    const settings = {
      contact_whatsapp: '593963162788',
      cartelera_contact_message: 'Hola, deseo contratar el módulo de Cartelera de Eventos en mi cuenta.',
      logistics_contact_message: 'Hola, deseo contratar el módulo de Logística en mi cuenta.'
    };
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    res.json({ status: 'OK', settings });
  } catch (err) {
    // Si hay error en base de datos, devolver valores por defecto seguros
    res.json({
      status: 'OK',
      settings: {
        contact_whatsapp: '593963162788',
        cartelera_contact_message: 'Hola, deseo contratar el módulo de Cartelera de Eventos en mi cuenta.',
        logistics_contact_message: 'Hola, deseo contratar el módulo de Logística en mi cuenta.'
      }
    });
  }
};

// Actualizar configuración (Solo Admin)
exports.updateSettings = async (req, res) => {
  const { contact_whatsapp, cartelera_contact_message, logistics_contact_message } = req.body;
  
  try {
    const updates = [
      { key: 'contact_whatsapp', value: contact_whatsapp },
      { key: 'cartelera_contact_message', value: cartelera_contact_message },
      { key: 'logistics_contact_message', value: logistics_contact_message }
    ];

    for (const item of updates) {
      if (item.value !== undefined) {
        await query(
          `INSERT INTO platform_settings (key, value, updated_at) 
           VALUES ($1, $2, NOW()) 
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
          [item.key, String(item.value)]
        );
      }
    }

    res.json({ status: 'OK', message: 'Configuración actualizada exitosamente.' });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
};
