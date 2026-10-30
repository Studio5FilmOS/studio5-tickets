const { query } = require('../config/db');
const https = require('https');

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

// Actualizar configuración básica (Solo Admin)
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

// Obtener Configuración Avanzada de WhatsApp Meta Cloud API (Admin y Organizadores)
exports.getWhatsAppConfig = async (req, res) => {
  try {
    const result = await query(
      "SELECT key, value FROM platform_settings WHERE key LIKE 'whatsapp_%'"
    );
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });

    const config = {
      mode: settings.whatsapp_mode || 'shared',
      display_phone: settings.whatsapp_display_phone || '+593 99 008 9200',
      waba_id: settings.whatsapp_waba_id || '4568598126688136',
      phone_number_id: settings.whatsapp_phone_number_id || '1449433818246739',
      app_id: settings.whatsapp_app_id || '3356348501216457',
      has_custom_token: Boolean(settings.whatsapp_access_token),
      status: 'CONNECTED',
      business_name: 'Studio 5 Film & Art - WhatsApp Official Business Platform',
      quality_rating: 'GREEN',
      templates: [
        {
          id: '1594911195208756',
          name: 'confirmacion_boletos_studio5',
          category: 'UTILITY',
          status: 'APPROVED',
          language: 'es',
          header: 'Taquilla Oficial',
          body: 'Estimado(a) {{1}}, tu compra para el evento {{2}} ha sido confirmada con éxito. Tu orden es la #{{3}} para la localidad {{4}}. Puedes ver y presentar tu boleto oficial en el siguiente enlace: {{5}} ¡Que disfrutes la función con Studio 5!',
          footer: 'Studio 5 Film & Art - Taquilla Oficial',
          variables: ['Nombre del Cliente', 'Nombre del Evento', 'Número de Orden', 'Localidad', 'Enlace al Boleto']
        },
        {
          id: '938659579120322',
          name: 'notificacion_studio5',
          category: 'UTILITY',
          status: 'APPROVED',
          language: 'es',
          header: 'Studio 5 Film & Art',
          body: 'Hola {{1}}, te saluda KAI el asistente oficial de Studio 5 Film & Art. Te escribo con la siguiente información: {{2}} ¡Quedo a tu entera disposición!',
          footer: 'Studio 5 Film & Art',
          variables: ['Nombre del Contacto', 'Mensaje Operativo / Notificación']
        }
      ]
    };

    res.json({ status: 'OK', config });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
};

// Actualizar Configuración Avanzada de WhatsApp Meta Cloud API
exports.updateWhatsAppConfig = async (req, res) => {
  const { mode, waba_id, phone_number_id, display_phone, access_token } = req.body;
  try {
    const updates = [
      { key: 'whatsapp_mode', value: mode },
      { key: 'whatsapp_waba_id', value: waba_id },
      { key: 'whatsapp_phone_number_id', value: phone_number_id },
      { key: 'whatsapp_display_phone', value: display_phone }
    ];
    if (access_token) {
      updates.push({ key: 'whatsapp_access_token', value: access_token });
    }

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

    res.json({ status: 'OK', message: 'Configuración de WhatsApp guardada exitosamente.' });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
};

// Sincronizar Plantillas en tiempo real con Meta Graph API
exports.getLiveTemplates = async (req, res) => {
  try {
    const wabaId = process.env.META_WABA_ID || '4568598126688136';
    const token = process.env.META_GRAPH_TOKEN || 'EAAvslMgoTMkBSZBbUX4GE7Bq9oMApGKZAjzmVTcGVvZBPsqR4zidA57IBRpWPpFAyCoSnxtG2xU5G37413mI8ZBswAYPLJp638r3CZAz5psrxML7bFCVCUZB9w73RzRL2eCLswAA23kevnhkzZBvzA2fvTRluWjBw4xYEyw3d7CMdXZApBZCCoi6QLMEhQR0j1qBdYgZDZD';

    const options = {
      hostname: 'graph.facebook.com',
      path: `/v21.0/${wabaId}/message_templates`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const apiReq = https.request(options, (apiRes) => {
      let data = '';
      apiRes.on('data', chunk => data += chunk);
      apiRes.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          res.json({ status: 'OK', templates: parsed.data || [] });
        } catch (e) {
          res.json({ status: 'OK', templates: [] });
        }
      });
    });
    apiReq.on('error', (err) => {
      res.status(500).json({ status: 'ERROR', message: err.message });
    });
    apiReq.end();
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
};

// Envío de Prueba de Notificación por WhatsApp
exports.testWhatsAppSend = async (req, res) => {
  const { phone, template_name } = req.body;
  if (!phone) {
    return res.status(400).json({ status: 'ERROR', message: 'El número de teléfono es obligatorio.' });
  }
  try {
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID || '1449433818246739';
    const token = process.env.META_GRAPH_TOKEN || 'EAAvslMgoTMkBSZBbUX4GE7Bq9oMApGKZAjzmVTcGVvZBPsqR4zidA57IBRpWPpFAyCoSnxtG2xU5G37413mI8ZBswAYPLJp638r3CZAz5psrxML7bFCVCUZB9w73RzRL2eCLswAA23kevnhkzZBvzA2fvTRluWjBw4xYEyw3d7CMdXZApBZCCoi6QLMEhQR0j1qBdYgZDZD';

    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('593') ? cleanPhone : (cleanPhone.startsWith('0') ? '593' + cleanPhone.substring(1) : '593' + cleanPhone);

    const postData = JSON.stringify({
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: template_name || 'confirmacion_boletos_studio5',
        language: { code: 'es' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'Jesse Añazco (Prueba)' },
              { type: 'text', text: 'La Bella y la Bestia - El Musical' },
              { type: 'text', text: 'TEST-1001' },
              { type: 'text', text: 'VIP Platea Baja' },
              { type: 'text', text: 'https://ticket.studio5film.com/orden/demo' }
            ]
          }
        ]
      }
    });

    const opt = {
      hostname: 'graph.facebook.com',
      path: `/v21.0/${phoneNumberId}/messages`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const graphReq = https.request(opt, (graphRes) => {
      let responseBody = '';
      graphRes.on('data', chunk => responseBody += chunk);
      graphRes.on('end', () => {
        try {
          const parsed = JSON.parse(responseBody);
          if (parsed.error) {
            return res.status(400).json({ status: 'ERROR', error: parsed.error });
          }
          res.json({ status: 'OK', result: parsed, message: `Mensaje de prueba enviado exitosamente a +${formattedPhone}` });
        } catch (e) {
          res.json({ status: 'OK', raw: responseBody });
        }
      });
    });

    graphReq.on('error', (err) => {
      res.status(500).json({ status: 'ERROR', message: err.message });
    });

    graphReq.write(postData);
    graphReq.end();
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
};
