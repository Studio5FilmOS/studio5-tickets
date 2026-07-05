const { query } = require('../config/db');
const fs = require('fs');
const path = require('path');

// Listar todos los eventos
exports.getAllEvents = async (req, res) => {
  const isAdminOrStaff = req.user && ['admin', 'staff'].includes(req.user.role);

  try {
    let sqlEvents = 'SELECT * FROM events ORDER BY created_at DESC';
    let params = [];
    
    if (!isAdminOrStaff) {
      sqlEvents = "SELECT * FROM events WHERE status = 'active' ORDER BY created_at DESC";
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
          booked_seats // Lista de butacas ocupadas para esta función
        });
      }
      
      event.schedules = schedules;
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

// Crear evento (Solo Admin)
exports.createEvent = async (req, res) => {
  const {
    title, description, venue, banner_url, ticket_template_url,
    price_adult, price_child, capacity_total, is_single_rate,
    has_assigned_seats, seating_layout, promo_type, price_promo,
    promo_deadline, status, schedules
  } = req.body;

  if (!title || !venue || !banner_url || capacity_total === undefined) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'Título, lugar, afiche y aforo máximo son obligatorios.'
    });
  }

  try {
    // Formatear seating_layout como JSON
    let layoutJson = null;
    if (has_assigned_seats) {
      layoutJson = Array.isArray(seating_layout) ? JSON.stringify(seating_layout) : seating_layout;
    }

    // Insertar Evento
    const eventRes = await query(
      `INSERT INTO events 
       (title, description, venue, banner_url, ticket_template_url, price_adult, price_child, capacity_total, is_single_rate, has_assigned_seats, seating_layout, promo_type, price_promo, promo_deadline, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        title, description, venue, banner_url, ticket_template_url,
        price_adult || 0.00, price_child || 0.00, capacity_total, is_single_rate || false,
        has_assigned_seats || false, layoutJson, promo_type || 'Ninguna', price_promo || 0.00,
        promo_deadline || null, status || 'active'
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

// Actualizar evento (Solo Admin)
exports.updateEvent = async (req, res) => {
  const { id } = req.params;
  const {
    title, description, venue, banner_url, ticket_template_url,
    price_adult, price_child, capacity_total, is_single_rate,
    has_assigned_seats, seating_layout, promo_type, price_promo,
    promo_deadline, status, schedules
  } = req.body;

  try {
    const checkRes = await query('SELECT id FROM events WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        message: 'Evento no encontrado.'
      });
    }

    let layoutJson = null;
    if (has_assigned_seats) {
      layoutJson = Array.isArray(seating_layout) ? JSON.stringify(seating_layout) : seating_layout;
    }

    // Actualizar Evento
    const eventRes = await query(
      `UPDATE events SET 
       title = $1, description = $2, venue = $3, banner_url = $4, ticket_template_url = $5,
       price_adult = $6, price_child = $7, capacity_total = $8, is_single_rate = $9,
       has_assigned_seats = $10, seating_layout = $11, promo_type = $12, price_promo = $13,
       promo_deadline = $14, status = $15, updated_at = NOW()
       WHERE id = $16
       RETURNING *`,
      [
        title, description, venue, banner_url, ticket_template_url,
        price_adult, price_child, capacity_total, is_single_rate,
        has_assigned_seats, layoutJson, promo_type, price_promo,
        promo_deadline || null, status, id
      ]
    );

    const updatedEvent = eventRes.rows[0];

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

// Alternar estado de evento (Solo Admin)
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

    const matches = image.match(/^data:image\/([A-Za-z\-+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ status: 'ERROR', message: 'Formato de imagen inválido o corrupto.' });
    }

    const imageExtension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const base64Data = matches[2];
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
    // LLamada a OpenRouter (usando fetch nativo de Node.js)
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
                text: 'Analiza esta imagen de un plano de asientos (butacas) de teatro/cine. Identifica e inscribe todos los códigos de asientos (por ejemplo: A1, A2, A3, B1, B2, B3, C1...). Devuelve EXCLUSIVAMENTE una lista JSON plana con las etiquetas identificadas en formato de strings. Ejemplo: ["A1","A2","B1","B2"]. No devuelvas formato markdown, ni bloques de código, ni comentarios adicionales.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: image // Formato data:image/jpeg;base64,...
                }
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
    
    // Intentar parsear el JSON
    let parsedSeats = [];
    try {
      // Limpiar markdown del mensaje si la IA desobedeció
      const cleanJson = assistantMessage.replace(/```json|```/g, '').trim();
      parsedSeats = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.warn('Fallo al parsear JSON directamente de la respuesta de la IA. Intentando extraer array.', assistantMessage);
      const match = assistantMessage.match(/\[\s*".*?"\s*(?:,\s*".*?"\s*)*\]/s);
      if (match) {
        parsedSeats = JSON.parse(match[0]);
      } else {
        throw new Error('No se pudo interpretar el formato de respuesta del plano.');
      }
    }

    if (!Array.isArray(parsedSeats)) {
      throw new Error('La respuesta de la IA no es un listado válido de asientos.');
    }

    res.json({
      status: 'OK',
      seats: parsedSeats.map(s => s.trim().toUpperCase()).filter(s => s.length > 0)
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
