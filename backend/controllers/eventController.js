const { query } = require('../config/db');

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
  }
};
