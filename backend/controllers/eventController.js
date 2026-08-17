const { query } = require('../config/db');
const fs = require('fs');
const path = require('path');

// Helper: elimina un archivo físico del volumen uploads (seguro, no lanza error)
const deleteUploadFile = (fileUrl) => {
  if (!fileUrl) return;
  try {
    const relative = fileUrl.replace(/^.*\/public/, '');
    const fullPath = path.join(__dirname, '..', 'public', relative);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`🗑️ Archivo eliminado: ${fullPath}`);
    }
  } catch (err) {
    console.warn('⚠️ No se pudo eliminar archivo:', fileUrl, err.message);
  }
};

// Helper para obtener localidades de un evento
const getLocalidadesForEvent = async (eventId) => {
  try {
    const res = await query(
      'SELECT id, nombre, precio, aforo_total, aforo_disponible, color FROM localidades WHERE event_id = $1 ORDER BY precio DESC, nombre ASC',
      [eventId]
    );
    return res.rows;
  } catch (e) {
    console.warn('Error al obtener localidades:', e.message);
    return [];
  }
};

// Listar todos los eventos
exports.getAllEvents = async (req, res) => {
  const user = req.user;
  const isAdmin = user && user.role === 'admin';
  const isStaff = user && user.role === 'staff';
  const isOrganizer = user && user.role === 'organizer';

  try {
    let sqlEvents = 'SELECT * FROM events ORDER BY created_at DESC';
    let params = [];

    if (isOrganizer) {
      // Organizadores solo ven sus propios eventos
      sqlEvents = 'SELECT * FROM events WHERE organizer_id = $1 ORDER BY created_at DESC';
      params = [user.id];
    } else if (!isAdmin && !isStaff) {
      // Clientes públicos solo ven eventos activos no archivados
      sqlEvents = "SELECT * FROM events WHERE status = 'active' AND is_archived = FALSE ORDER BY created_at DESC";
    }

    const eventsRes = await query(sqlEvents, params);
    const events = eventsRes.rows;

    for (let event of events) {
      // Obtener funciones
      const schedulesRes = await query(
        `SELECT es.id, es.schedule_time,
         COALESCE(SUM(o.ticket_count_adult + o.ticket_count_child), 0)::integer as sold_tickets
         FROM event_schedules es
         LEFT JOIN orders o ON o.schedule_id = es.id AND o.payment_status != 'Anulado'
         WHERE es.event_id = $1
         GROUP BY es.id, es.schedule_time
         ORDER BY es.schedule_time ASC`,
        [event.id]
      );

      // Para cada función, obtener la lista de asientos ya reservados
      const schedules = [];
      for (let sch of schedulesRes.rows) {
        const bookedSeatsRes = await query(
          `SELECT t.seat_label 
           FROM tickets t 
           JOIN orders o ON o.id = t.order_id 
           WHERE o.schedule_id = $1 AND o.payment_status != 'Anulado' AND t.seat_label IS NOT NULL`,
          [sch.id]
        );
        
        const booked_seats = bookedSeatsRes.rows.map(r => r.seat_label);
        const available = event.capacity_total - sch.sold_tickets;

        schedules.push({
          id: sch.id,
          schedule_time: sch.schedule_time,
          sold_tickets: sch.sold_tickets,
          available_capacity: available < 0 ? 0 : available,
          booked_seats
        });
      }
      
      event.schedules = schedules;
      // Añadir localidades
      event.localidades = await getLocalidadesForEvent(event.id);
    }

    res.json({
      status: 'OK',
      events
    });
  } catch (err) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al obtener los eventos',
      error: err.message
    });
  }
};

// Obtener detalle de un único evento
exports.getEventById = async (req, res) => {
  const { id } = req.params;

  try {
    const eventRes = await query('SELECT * FROM events WHERE id = $1', [id]);
    if (eventRes.rows.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        message: 'Evento no encontrado.'
      });
    }

    const event = eventRes.rows[0];

    // Obtener funciones
    const schedulesRes = await query(
      `SELECT es.id, es.schedule_time,
       COALESCE(SUM(o.ticket_count_adult + o.ticket_count_child), 0)::integer as sold_tickets
       FROM event_schedules es
       LEFT JOIN orders o ON o.schedule_id = es.id AND o.payment_status != 'Anulado'
       WHERE es.event_id = $1
       GROUP BY es.id, es.schedule_time
       ORDER BY es.schedule_time ASC`,
      [event.id]
    );

    const schedules = [];
    for (let sch of schedulesRes.rows) {
      const bookedSeatsRes = await query(
        `SELECT t.seat_label 
         FROM tickets t 
         JOIN orders o ON o.id = t.order_id 
         WHERE o.schedule_id = $1 AND o.payment_status != 'Anulado' AND t.seat_label IS NOT NULL`,
        [sch.id]
      );
      
      const booked_seats = bookedSeatsRes.rows.map(r => r.seat_label);
      const available = event.capacity_total - sch.sold_tickets;

      schedules.push({
        id: sch.id,
        schedule_time: sch.schedule_time,
        sold_tickets: sch.sold_tickets,
        available_capacity: available < 0 ? 0 : available,
        booked_seats
      });
    }

    event.schedules = schedules;
    event.localidades = await getLocalidadesForEvent(event.id);

    res.json({
      status: 'OK',
      event
    });
  } catch (err) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al obtener el evento',
      error: err.message
    });
  }
};

// Crear evento (Admin / Organizer)
exports.createEvent = async (req, res) => {
  const {
    title, description, venue, banner_url, ticket_template_url,
    price_adult, price_child, capacity_total, is_single_rate,
    has_assigned_seats, seating_layout, promo_type, price_promo,
    promo_deadline, status, schedules, localidades, theme_config, organizer_id
  } = req.body;

  if (!title || !venue || !banner_url || capacity_total === undefined) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'Título, lugar, afiche y aforo máximo son obligatorios.'
    });
  }

  const assignedOrganizerId = req.user && req.user.role === 'organizer' ? req.user.id : (organizer_id || null);

  // Validación de Token de Garantía Payphone para Organizadores
  if (req.user && req.user.role === 'organizer' && (status === 'active' || status === 'published')) {
    const userRes = await query('SELECT token_tarjeta FROM users WHERE id = $1', [req.user.id]);
    const tokenTarjeta = userRes.rows[0]?.token_tarjeta;
    if (!tokenTarjeta) {
      return res.status(400).json({
        status: 'ERROR',
        message: 'Es estrictamente obligatorio registrar y validar una tarjeta de garantía (token Payphone) en su perfil de Organizador antes de publicar un evento.'
      });
    }
  }

  try {
    let layoutJson = null;
    if (has_assigned_seats) {
      layoutJson = Array.isArray(seating_layout) ? JSON.stringify(seating_layout) : seating_layout;
    }

    const themeConfigJson = theme_config ? JSON.stringify(theme_config) : JSON.stringify({
      primaryColor: '#DEB841',
      secondaryColor: '#b08d2b',
      logoUrl: 'https://i.imgur.com/0z5756T.png',
      tenantName: 'Studio 5'
    });

    // Insertar Evento
    const eventRes = await query(
      `INSERT INTO events 
       (organizer_id, title, description, venue, banner_url, ticket_template_url, price_adult, price_child, capacity_total, is_single_rate, has_assigned_seats, seating_layout, promo_type, price_promo, promo_deadline, status, require_billing, theme_config, qr_scanning_enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, TRUE)
       RETURNING *`,
      [
        assignedOrganizerId,
        title, description, venue, banner_url, ticket_template_url,
        price_adult || 0.00, price_child || 0.00, capacity_total, is_single_rate || false,
        has_assigned_seats || false, layoutJson, promo_type || 'Ninguna', price_promo || 0.00,
        promo_deadline || null, status || 'active', req.body.require_billing || false,
        themeConfigJson
      ]
    );

    const newEvent = eventRes.rows[0];

    // Insertar Fechas/Funciones si se proveen
    newEvent.schedules = [];
    if (schedules && Array.isArray(schedules) && schedules.length > 0) {
      for (let schTime of schedules) {
        if (!schTime) continue;
        const schRes = await query(
          'INSERT INTO event_schedules (event_id, schedule_time) VALUES ($1, $2) RETURNING id, schedule_time',
          [newEvent.id, schTime]
        );
        newEvent.schedules.push(schRes.rows[0]);
      }
    }

    // Insertar Localidades si se proveen
    newEvent.localidades = [];
    if (localidades && Array.isArray(localidades) && localidades.length > 0) {
      for (let loc of localidades) {
        if (!loc.nombre) continue;
        const locRes = await query(
          `INSERT INTO localidades (event_id, nombre, precio, aforo_total, aforo_disponible, color)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            newEvent.id,
            loc.nombre,
            parseFloat(loc.precio) || 0.00,
            parseInt(loc.aforo_total) || 0,
            parseInt(loc.aforo_disponible !== undefined ? loc.aforo_disponible : loc.aforo_total) || 0,
            loc.color || '#DEB841'
          ]
        );
        newEvent.localidades.push(locRes.rows[0]);
      }
    }

    res.status(201).json({
      status: 'OK',
      message: 'Evento creado exitosamente',
      event: newEvent
    });
  } catch (err) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al crear el evento',
      error: err.message
    });
  }
};

// Actualizar evento (Admin / Organizer)
exports.updateEvent = async (req, res) => {
  const { id } = req.params;
  const {
    title, description, venue, banner_url, ticket_template_url,
    price_adult, price_child, capacity_total, is_single_rate,
    has_assigned_seats, seating_layout, promo_type, price_promo,
    promo_deadline, status, schedules, localidades, theme_config, qr_scanning_enabled
  } = req.body;

  try {
    const checkRes = await query('SELECT * FROM events WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        message: 'Evento no encontrado.'
      });
    }

    const existingEvent = checkRes.rows[0];

    // Si es organizador, asegurar que sea dueño del evento
    if (req.user && req.user.role === 'organizer') {
      if (existingEvent.organizer_id && existingEvent.organizer_id !== req.user.id) {
        return res.status(403).json({
          status: 'ERROR',
          message: 'No tienes autorización para modificar este evento.'
        });
      }

      // Validar token de garantía si pasa a publicado/activo
      if ((status === 'active' || status === 'published') && existingEvent.status !== 'active') {
        const userRes = await query('SELECT token_tarjeta FROM users WHERE id = $1', [req.user.id]);
        if (!userRes.rows[0]?.token_tarjeta) {
          return res.status(400).json({
            status: 'ERROR',
            message: 'Es estrictamente obligatorio registrar y validar una tarjeta de garantía (token Payphone) antes de publicar este evento.'
          });
        }
      }
    }

    let layoutJson = null;
    if (has_assigned_seats) {
      layoutJson = Array.isArray(seating_layout) ? JSON.stringify(seating_layout) : seating_layout;
    }

    const themeConfigJson = theme_config ? (typeof theme_config === 'string' ? theme_config : JSON.stringify(theme_config)) : JSON.stringify(existingEvent.theme_config || {});

    // Actualizar Evento
    const eventRes = await query(
      `UPDATE events SET 
       title = $1, description = $2, venue = $3, banner_url = $4, ticket_template_url = $5,
       price_adult = $6, price_child = $7, capacity_total = $8, is_single_rate = $9,
       has_assigned_seats = $10, seating_layout = $11, promo_type = $12, price_promo = $13,
       promo_deadline = $14, status = $15, require_billing = $16, theme_config = $17,
       qr_scanning_enabled = $18, updated_at = NOW()
       WHERE id = $19
       RETURNING *`,
      [
        title, description, venue, banner_url, ticket_template_url,
        price_adult, price_child, capacity_total, is_single_rate,
        has_assigned_seats, layoutJson, promo_type, price_promo,
        promo_deadline || null, status, req.body.require_billing || false,
        themeConfigJson,
        qr_scanning_enabled !== undefined ? qr_scanning_enabled : existingEvent.qr_scanning_enabled,
        id
      ]
    );

    const updatedEvent = eventRes.rows[0];

    // Sincronizar Funciones / Fechas
    if (schedules && Array.isArray(schedules)) {
      const activeSchs = await query(
        `SELECT DISTINCT schedule_id FROM orders WHERE event_id = $1 AND payment_status != 'Anulado'`,
        [id]
      );
      const activeSchIds = activeSchs.rows.map(r => r.schedule_id);

      if (activeSchIds.length > 0) {
        await query(
          'DELETE FROM event_schedules WHERE event_id = $1 AND id NOT IN (SELECT id FROM unnest($2::uuid[]))',
          [id, activeSchIds]
        );
      } else {
        await query('DELETE FROM event_schedules WHERE event_id = $1', [id]);
      }

      for (let schTime of schedules) {
        if (!schTime) continue;
        const dupRes = await query(
          'SELECT id FROM event_schedules WHERE event_id = $1 AND schedule_time = $2',
          [id, schTime]
        );
        if (dupRes.rows.length === 0) {
          await query(
            'INSERT INTO event_schedules (event_id, schedule_time) VALUES ($1, $2)',
            [id, schTime]
          );
        }
      }
    }

    // Sincronizar Localidades
    if (localidades && Array.isArray(localidades)) {
      for (const loc of localidades) {
        if (loc.id) {
          // Actualizar existente
          await query(
            `UPDATE localidades SET nombre = $1, precio = $2, aforo_total = $3, aforo_disponible = $4, color = $5, updated_at = NOW() WHERE id = $6 AND event_id = $7`,
            [loc.nombre, parseFloat(loc.precio) || 0, parseInt(loc.aforo_total) || 0, parseInt(loc.aforo_disponible) || 0, loc.color || '#DEB841', loc.id, id]
          );
        } else if (loc.nombre) {
          // Insertar nueva
          await query(
            `INSERT INTO localidades (event_id, nombre, precio, aforo_total, aforo_disponible, color) VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, loc.nombre, parseFloat(loc.precio) || 0, parseInt(loc.aforo_total) || 0, parseInt(loc.aforo_disponible !== undefined ? loc.aforo_disponible : loc.aforo_total) || 0, loc.color || '#DEB841']
          );
        }
      }
    }

    updatedEvent.localidades = await getLocalidadesForEvent(id);

    res.json({
      status: 'OK',
      message: 'Evento actualizado exitosamente',
      event: updatedEvent
    });
  } catch (err) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al actualizar el evento',
      error: err.message
    });
  }
};

// Actualizar Marca Blanca / Theming específico de evento
exports.updateEventTheme = async (req, res) => {
  const { id } = req.params;
  const { primaryColor, secondaryColor, logoUrl, tenantName } = req.body;

  try {
    const themeConfig = {
      primaryColor: primaryColor || '#DEB841',
      secondaryColor: secondaryColor || '#b08d2b',
      logoUrl: logoUrl || 'https://i.imgur.com/0z5756T.png',
      tenantName: tenantName || 'Studio 5'
    };

    const result = await query(
      'UPDATE events SET theme_config = $1, updated_at = NOW() WHERE id = $2 RETURNING id, title, theme_config',
      [JSON.stringify(themeConfig), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'ERROR', message: 'Evento no encontrado' });
    }

    res.json({
      status: 'OK',
      message: 'Tema de Marca Blanca actualizado correctamente',
      theme_config: themeConfig
    });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: 'Error al guardar tema', error: err.message });
  }
};

// Alternar estado de evento (Solo Admin / Organizer)
exports.toggleEventStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['active', 'inactive'].includes(status)) {
    return res.status(400).json({
      status: 'ERROR',
      message: "Estado inválido. Debe ser 'active' o 'inactive'."
    });
  }

  try {
    const result = await query(
      "UPDATE events SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, title, status",
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        message: 'Evento no encontrado.'
      });
    }

    res.json({
      status: 'OK',
      message: `El evento ahora está ${status === 'active' ? 'Activo' : 'Inactivo'}.`,
      event: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al cambiar estado del evento',
      error: err.message
    });
  }
};

// Subir afiche o fondo de boleto comprimido (base64)
exports.uploadImage = async (req, res) => {
  const { image, type } = req.body;
  if (!image) {
    return res.status(400).json({ status: 'ERROR', message: 'No se envió ninguna imagen.' });
  }

  try {
    const folder = type === 'ticket' ? 'tickets' : 'banners';
    const uploadsDir = path.join(__dirname, '..', 'public', 'uploads', folder);
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    if (!image.startsWith('data:image/')) {
      return res.status(400).json({ status: 'ERROR', message: 'Formato de imagen inválido. Debe comenzar con data:image/.' });
    }

    const semiColonIdx = image.indexOf(';');
    const commaIdx = image.indexOf(',');
    if (semiColonIdx === -1 || commaIdx === -1 || !image.includes('base64,')) {
      return res.status(400).json({ status: 'ERROR', message: 'Formato de codificación de imagen inválido.' });
    }

    const mimeType = image.substring(5, semiColonIdx);
    const ext = mimeType.split('/')[1] || 'png';
    const imageExtension = ext === 'jpeg' ? 'jpg' : ext;
    const base64Data = image.substring(commaIdx + 1);
    const filename = `${type || 'img'}_${Date.now()}_${Math.round(Math.random() * 1e9)}.${imageExtension}`;
    const filepath = path.join(uploadsDir, filename);

    fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'));
    const publicPath = `/uploads/${folder}/${filename}`;

    res.json({
      status: 'OK',
      url: publicPath
    });
  } catch (err) {
    console.error('Error al subir imagen:', err);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al almacenar la imagen en el servidor.',
      error: err.message
    });
  }
};

// Analizar croquis de butacas con IA a través de OpenRouter
exports.parseSeatingLayout = async (req, res) => {
  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ status: 'ERROR', message: 'No se envió ninguna imagen del plano.' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'Configuración de IA no disponible en el servidor. Por favor define la variable OPENROUTER_API_KEY en tu .env.'
    });
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5000',
        'X-Title': 'Studio 5 Tickets'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Eres un sistema de digitalización de planos de sala de teatro/cine. Convierte la imagen en una cuadrícula 2D exacta de butacas (JSON array de strings). Devuelve SOLO el JSON.`
              },
              {
                type: 'image_url',
                image_url: { url: image }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || '';
    
    let parsedSeats = [];
    try {
      const cleanJson = assistantMessage.replace(/```json|```/g, '').trim();
      parsedSeats = JSON.parse(cleanJson);
    } catch (parseErr) {
      const startIdx = assistantMessage.indexOf('[');
      const endIdx = assistantMessage.lastIndexOf(']');
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        parsedSeats = JSON.parse(assistantMessage.substring(startIdx, endIdx + 1));
      } else {
        throw new Error('No se pudo interpretar el formato de respuesta del plano.');
      }
    }

    res.json({
      status: 'OK',
      seats: parsedSeats
    });
  } catch (err) {
    console.error('Error al analizar plano con IA:', err);
    res.status(500).json({
      status: 'ERROR',
      message: 'Fallo al procesar el plano con IA.',
      error: err.message
    });
  }
};

// Eliminar evento (Soft Delete)
exports.deleteEvent = async (req, res) => {
  const { id } = req.params;

  try {
    const eventData = await query('SELECT banner_url, ticket_template_url FROM events WHERE id = $1', [id]);
    const eventFiles = eventData.rows[0] || {};

    await query("UPDATE events SET is_archived = TRUE, status = 'inactive', banner_url = '', ticket_template_url = '' WHERE id = $1", [id]);

    deleteUploadFile(eventFiles.banner_url);
    deleteUploadFile(eventFiles.ticket_template_url);

    res.json({
      status: 'OK',
      action: 'archived',
      message: 'Evento archivado e imágenes eliminadas con éxito. El historial de ventas se mantiene intacto.'
    });
  } catch (err) {
    console.error('Error al archivar evento:', err);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al archivar el evento',
      error: err.message
    });
  }
};

exports.forceDeleteEvent = async (req, res) => {
  return exports.deleteEvent(req, res);
};
