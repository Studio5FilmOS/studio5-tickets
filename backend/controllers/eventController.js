const { query } = require('../config/db');
const fs = require('fs');
const path = require('path');

// Helper: elimina un archivo físico del volumen uploads (seguro, no lanza error)
const deleteUploadFile = (fileUrl) => {
  if (!fileUrl) return;
  try {
    // fileUrl puede ser: /uploads/banners/xxx.jpg o una URL completa
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
       (title, description, venue, banner_url, ticket_template_url, price_adult, price_child, capacity_total, is_single_rate, has_assigned_seats, seating_layout, promo_type, price_promo, promo_deadline, status, require_billing)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        title, description, venue, banner_url, ticket_template_url,
        price_adult || 0.00, price_child || 0.00, capacity_total, is_single_rate || false,
        has_assigned_seats || false, layoutJson, promo_type || 'Ninguna', price_promo || 0.00,
        promo_deadline || null, status || 'active', req.body.require_billing || false
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
       promo_deadline = $14, status = $15, require_billing = $16, updated_at = NOW()
       WHERE id = $17
       RETURNING *`,
      [
        title, description, venue, banner_url, ticket_template_url,
        price_adult, price_child, capacity_total, is_single_rate,
        has_assigned_seats, layoutJson, promo_type, price_promo,
        promo_deadline || null, status, req.body.require_billing || false, id
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

    const mimeType = image.substring(5, semiColonIdx); // e.g. "image/jpeg"
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
                text: `Eres un sistema de digitalización de planos de sala de teatro/cine. Tu tarea es convertir la imagen en una CUADRÍCULA ABSOLUTA con posicionamiento exacto. Sigue estos pasos en orden:

PASO 1 — IDENTIFICAR EL ESCENARIO:
Localiza el escenario, pantalla o palco. La fila de asientos MÁS CERCANA al escenario será la fila 0 (primera en la matriz). Si el escenario está abajo en la imagen, invierte el orden vertical de las filas. Mantén los identificadores exactos del plano (A1, B3, etc.).

PASO 2 — MAPEAR LA CUADRÍCULA ABSOLUTA:
Esta es la regla más importante. Debes construir una cuadrícula donde TODAS las filas tienen EXACTAMENTE el mismo número de columnas.
- Determina el TOTAL de columnas físicas que tiene la sala de izquierda a derecha (incluyendo pasillos y espacios vacíos).
- Para cada fila, coloca el código del asiento (ej: "A1") en el índice de columna que corresponde a su posición física real.
- Si una fila no tiene asiento en cierta columna (porque hay un pasillo, la fila es más corta, la fila está desplazada, o las butacas están en media luna), pon "" en esa posición.
- El mismo pasillo vertical debe ser "" en el MISMO índice de columna en TODAS las filas.
- Si la fila E tiene 3 asientos a la izquierda (columnas 0,1,2) y 2 asientos a la derecha (columnas 8,9) con espacio vacío en el medio (columnas 3-7), el array de esa fila debe ser: ["E1","E2","E3","","","","","","E4","E5"].
- NUNCA inventes asientos que no están en el plano. NUNCA omitas espacios vacíos que sí están en el plano.

PASO 3 — FORMATO DE SALIDA:
- Devuelve ÚNICAMENTE el JSON del array 2D. Sin texto adicional, sin markdown, sin bloques de código.
- Cada sub-array (fila) debe tener EXACTAMENTE el mismo número de elementos.
- Ejemplo con pasillo central y fila corta desplazada:
  [["A1","A2","A3","","A4","A5","A6"],
   ["B1","B2","B3","","B4","B5","B6"],
   ["","","C1","","C2","","""]]`
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
      console.warn('Fallo al parsear JSON directamente de la respuesta de la IA. Intentando extraer matriz.', assistantMessage);
      const startIdx = assistantMessage.indexOf('[');
      const endIdx = assistantMessage.lastIndexOf(']');
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        try {
          parsedSeats = JSON.parse(assistantMessage.substring(startIdx, endIdx + 1));
        } catch (subParseErr) {
          throw new Error('No se pudo interpretar el formato de respuesta del plano.');
        }
      } else {
        throw new Error('No se pudo interpretar el formato de respuesta del plano.');
      }
    }

    if (!Array.isArray(parsedSeats)) {
      throw new Error('La respuesta de la IA no es un listado válido de asientos.');
    }

    let normalizedLayout = [];
    if (Array.isArray(parsedSeats[0])) {
      normalizedLayout = parsedSeats.map(row => 
        row.map(s => typeof s === 'string' ? s.trim().toUpperCase() : "")
      );
    } else {
      normalizedLayout = parsedSeats
        .map(s => typeof s === 'string' ? s.trim().toUpperCase() : "")
        .filter(s => s.length > 0);
    }

    res.json({
      status: 'OK',
      seats: normalizedLayout
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

// Eliminar un evento (o desactivarlo si tiene órdenes asociadas)
exports.deleteEvent = async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Verificar si existen órdenes asociadas a este evento
    const ordersCheck = await query('SELECT COUNT(*)::integer FROM orders WHERE event_id = $1', [id]);
    const ordersCount = ordersCheck.rows[0].count;

    // Obtener URLs de archivos del evento para limpiar después
    const eventData = await query('SELECT banner_url, ticket_template_url FROM events WHERE id = $1', [id]);
    const eventFiles = eventData.rows[0] || {};

    if (ordersCount > 0) {
      // Tiene órdenes, no se puede eliminar físicamente. Cambiar estado a inactivo
      await query("UPDATE events SET status = 'inactive' WHERE id = $1", [id]);
      return res.json({
        status: 'OK',
        action: 'archived',
        message: 'El evento tiene ventas y no puede ser borrado físicamente para no perder el historial de tickets. Se ha cambiado su estado a "Inactivo" para retirarlo de cartelera.'
      });
    }

    // 2. Si no tiene órdenes, se puede borrar físicamente de forma segura
    await query('DELETE FROM events WHERE id = $1', [id]);

    // 3. Limpiar archivos físicos del evento
    deleteUploadFile(eventFiles.banner_url);
    deleteUploadFile(eventFiles.ticket_template_url);

    res.json({
      status: 'OK',
      action: 'deleted',
      message: 'Evento e imágenes eliminados con éxito.'
    });
  } catch (err) {
    console.error('Error al eliminar evento:', err);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al eliminar el evento',
      error: err.message
    });
  }
};

// Eliminar FORZADO un evento con todas sus órdenes y tickets (Solo Admin - datos de prueba)
exports.forceDeleteEvent = async (req, res) => {
  const { id } = req.params;

  try {
    const eventCheck = await query('SELECT id, title, banner_url, ticket_template_url FROM events WHERE id = $1', [id]);
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ status: 'ERROR', message: 'Evento no encontrado.' });
    }

    const eventRow = eventCheck.rows[0];
    const eventTitle = eventRow.title;

    // 0. Recolectar URLs de comprobantes de órdenes antes de borrar
    const receiptsRes = await query(
      'SELECT comprobante_url FROM orders WHERE event_id = $1 AND comprobante_url IS NOT NULL',
      [id]
    );
    const receiptUrls = receiptsRes.rows.map(r => r.comprobante_url);

    // 1. Borrar tickets vinculados a órdenes de este evento
    await query(
      'DELETE FROM tickets WHERE order_id IN (SELECT id FROM orders WHERE event_id = $1)',
      [id]
    );

    // 2. Borrar órdenes del evento
    await query('DELETE FROM orders WHERE event_id = $1', [id]);

    // 3. Borrar funciones
    await query('DELETE FROM event_schedules WHERE event_id = $1', [id]);

    // 4. Borrar el evento
    await query('DELETE FROM events WHERE id = $1', [id]);

    // 5. Limpiar archivos físicos
    deleteUploadFile(eventRow.banner_url);
    deleteUploadFile(eventRow.ticket_template_url);
    receiptUrls.forEach(url => deleteUploadFile(url));
    console.log(`🗑️ Eliminados ${receiptUrls.length} comprobante(s) de transferencia del evento "${eventTitle}".`);

    res.json({
      status: 'OK',
      action: 'force_deleted',
      message: `El evento "${eventTitle}" y todos sus registros e imágenes han sido eliminados permanentemente.`
    });
  } catch (err) {
    console.error('Error al eliminar evento forzado:', err);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al eliminar el evento forzado',
      error: err.message
    });
  }
};

// Restaurar venta de Lady Carrillo
exports.restoreLady = async (req, res) => {
  try {
    const eventCheck = await query("SELECT id FROM events WHERE title = 'Enredados'");
    let eventId;
    if (eventCheck.rows.length > 0) {
      eventId = eventCheck.rows[0].id;
    } else {
      const eventRes = await query(
        `INSERT INTO events (title, description, venue, banner_url, ticket_template_url, price_adult, price_child, capacity_total, is_single_rate, has_assigned_seats, promo_type, price_promo, status, require_billing)
         VALUES ('Enredados', 'Una producción de Studio 5 Film & Art. Dirigida por Flopo y Jcason.', 'Sala La Bota', '', '', 10.00, 10.00, 150, true, false, 'Ninguna', 0.00, 'active', false)
         RETURNING id`
      );
      eventId = eventRes.rows[0].id;
    }

    const scheduleCheck = await query("SELECT id FROM event_schedules WHERE event_id = $1 AND schedule_time = '2026-07-19 01:00:00+00'", [eventId]);
    let scheduleId;
    if (scheduleCheck.rows.length > 0) {
      scheduleId = scheduleCheck.rows[0].id;
    } else {
      const scheduleRes = await query(
        `INSERT INTO event_schedules (event_id, schedule_time) VALUES ($1, '2026-07-19 01:00:00+00') RETURNING id`,
        [eventId]
      );
      scheduleId = scheduleRes.rows[0].id;
    }

    const userCheck = await query("SELECT id FROM users WHERE email = 'ladycarrillo_201@hotmail.com'");
    let userId;
    if (userCheck.rows.length > 0) {
      userId = userCheck.rows[0].id;
    } else {
      const userRes = await query(
        `INSERT INTO users (name, email, phone, role) VALUES ('LADY CARRILLO', 'ladycarrillo_201@hotmail.com', '0990846630', 'buyer') RETURNING id`
      );
      userId = userRes.rows[0].id;
    }

    const orderCheck = await query("SELECT id FROM orders WHERE order_num = 'ORD-88421289'");
    let orderId;
    if (orderCheck.rows.length > 0) {
      orderId = orderCheck.rows[0].id;
      // Forzar actualización a 'Pagado' por si quedó en 'Paid'
      await query(
        `UPDATE orders SET payment_status = 'Pagado', amount_total = 10.76, amount_net = 10.14, payment_method = 'Tarjeta de Débito' WHERE id = $1`,
        [orderId]
      );
    } else {
      const orderRes = await query(
        `INSERT INTO orders (order_num, buyer_id, customer_name, customer_email, customer_whatsapp, event_id, schedule_id, operation_type, payment_method, payment_status, amount_total, amount_net, ticket_count_adult, ticket_count_child, transaction_ref, is_final_consumer, created_at, updated_at)
         VALUES ('ORD-88421289', $1, 'LADY CARRILLO', 'ladycarrillo_201@hotmail.com', '0990846630', $2, $3, 'online', 'Tarjeta de Débito', 'Pagado', 10.76, 10.14, 1, 0, '88421289', true, '2026-07-06 20:34:00+00', '2026-07-06 20:34:00+00')
         RETURNING id`,
        [userId, eventId, scheduleId]
      );
      orderId = orderRes.rows[0].id;
    }

    const ticketCheck = await query("SELECT id FROM tickets WHERE ticket_code = 'TKT-1783370086305-1'");
    if (ticketCheck.rows.length === 0) {
      await query(
        `INSERT INTO tickets (order_id, ticket_code, ticket_type, status, created_at)
         VALUES ($1, 'TKT-1783370086305-1', 'Entrada General', 'Active', '2026-07-06 20:34:00+00')`,
        [orderId]
      );
    }

    res.json({
      status: 'OK',
      message: 'La venta de LADY CARRILLO y el evento Enredados han sido creados de manera segura en la nueva base de datos.'
    });
  } catch (err) {
    console.error('Error in restoreLady:', err);
    res.status(500).json({
      status: 'ERROR',
      message: 'Fallo al restaurar la orden',
      error: err.message
    });
  }
};
