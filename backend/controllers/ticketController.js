const { query } = require('../config/db');

// Obtener detalles públicos del ticket por su código de boleto individual
exports.getTicketByCode = async (req, res) => {
  const { code } = req.params;

  try {
    const ticketRes = await query(
      `SELECT t.*, o.customer_name, o.payment_status, o.operation_type, e.id as event_id, e.title as event_title, e.venue as event_venue, e.banner_url, e.ticket_template_url, es.id as schedule_id, es.schedule_time
       FROM tickets t
       JOIN orders o ON o.id = t.order_id
       JOIN events e ON e.id = o.event_id
       JOIN event_schedules es ON es.id = o.schedule_id
       WHERE t.ticket_code = $1`,
      [code]
    );

    if (ticketRes.rows.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        message: 'Boleto no encontrado.'
      });
    }

    res.json({
      status: 'OK',
      ticket: ticketRes.rows[0]
    });
  } catch (err) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al obtener el boleto',
      error: err.message
    });
  }
};

// Escanear QR Único de Compra
exports.validateTicket = async (req, res) => {
  const { ticketCode, byOrderId } = req.body;

  if (!ticketCode) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'Código de orden ausente.'
    });
  }

  try {
    let orderRes;
    
    if (byOrderId) {
      orderRes = await query(
        `SELECT o.*, e.title as event_title, e.venue as event_venue, e.has_assigned_seats, es.schedule_time
         FROM orders o
         JOIN events e ON e.id = o.event_id
         JOIN event_schedules es ON es.id = o.schedule_id
         WHERE o.id = $1`,
        [ticketCode]
      );
    } else {
      orderRes = await query(
        `SELECT o.*, e.title as event_title, e.venue as event_venue, e.has_assigned_seats, es.schedule_time
         FROM orders o
         JOIN events e ON e.id = o.event_id
         JOIN event_schedules es ON es.id = o.schedule_id
         LEFT JOIN tickets t ON t.order_id = o.id
         WHERE o.order_num = $1 OR t.ticket_code = $1
         LIMIT 1`,
        [ticketCode]
      );
    }

    if (orderRes.rows.length === 0) {
      return res.json({
        status: 'ERROR',
        message: '❌ COMPRA NO ENCONTRADA\nCódigo QR inválido o inexistente.'
      });
    }

    const order = orderRes.rows[0];

    if (order.payment_status === 'Anulado') {
      return res.json({
        status: 'ERROR',
        message: `❌ ACCESO DENEGADO\nEsta compra fue ANULADA.\nCliente: ${order.customer_name}`
      });
    }

    // Validar que la fecha de la función no sea ni muy pasada ni muy futura
    // Permite un margen de +/- 1.5 días para considerar cambios de zona horaria o eventos que terminan en la madrugada
    const scheduleDate = new Date(order.schedule_time);
    const today = new Date();
    const diffDays = (scheduleDate.getTime() - today.getTime()) / (1000 * 3600 * 24);

    if (diffDays < -1.5) {
      return res.json({
        status: 'ERROR',
        message: `❌ ACCESO DENEGADO\nBoleto de función pasada (${scheduleDate.toLocaleDateString('es-EC')}).`
      });
    }

    if (diffDays > 1.5) {
      return res.json({
        status: 'ERROR',
        message: `❌ ACCESO DENEGADO\nBoleto de función futura (${scheduleDate.toLocaleDateString('es-EC')}).`
      });
    }

    const ticketsRes = await query(
      `SELECT t.id, t.ticket_code, t.ticket_type, t.seat_label, t.status, t.checked_in_at
       FROM tickets t
       WHERE t.order_id = $1
       ORDER BY t.seat_label ASC, t.id ASC`,
      [order.id]
    );

    const tickets = ticketsRes.rows;

    if (order.payment_status === 'Pendiente') {
      return res.json({
        status: 'ADVERTENCIA',
        message: `⚠️ PAGO PENDIENTE DE COBRO\n\nCliente: ${order.customer_name}\nDebe cobrar: $${parseFloat(order.amount_total).toFixed(2)}\n\n(Aprobación requerida para ingresar)`,
        order,
        tickets
      });
    }

    return res.json({
      status: 'OK',
      message: 'Compra cargada con éxito',
      order,
      tickets
    });

  } catch (err) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Error interno en el servidor al cargar datos del QR.',
      error: err.message
    });
  }
};

// Check-In de entradas seleccionadas
exports.checkInTickets = async (req, res) => {
  const { ticketIds } = req.body;
  const staffId = req.user.id;

  if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'No se enviaron IDs de tickets para check-in.'
    });
  }

  try {
    const checkInRes = await query(
      `UPDATE tickets 
       SET status = 'Used', checked_in_at = NOW(), checked_in_by = $1 
       WHERE id = ANY($2::uuid[]) AND status = 'Active'
       RETURNING id, seat_label, ticket_type`,
      [staffId, ticketIds]
    );

    const updatedCount = checkInRes.rows.length;

    if (updatedCount === 0) {
      return res.json({
        status: 'ERROR',
        message: '❌ Ningún boleto pudo registrarse (ya fueron ingresados o anulados).'
      });
    }

    const labels = checkInRes.rows.map(r => r.seat_label || r.ticket_type).join(', ');

    return res.json({
      status: 'OK',
      message: `✅ Ingreso registrado con éxito para ${updatedCount} persona(s):\n[${labels}]`
    });

  } catch (err) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al registrar ingresos parciales.',
      error: err.message
    });
  }
};

// ===============================================
// LÓGICA DE INTERACTIVIDAD EN VIVO (MOMENTO WOW)
// ===============================================

// 1. Obtener estado de interactividad (Llamado por los espectadores con boleto oficial)
exports.getLiveInteraction = async (req, res) => {
  const { eventId, scheduleId, ticketId } = req.params;

  try {
    const activePollRes = await query(
      'SELECT id, question, options FROM event_polls WHERE event_id = $1 AND is_active = TRUE LIMIT 1',
      [eventId]
    );

    let activePoll = null;
    let hasVoted = false;

    if (activePollRes.rows.length > 0) {
      activePoll = activePollRes.rows[0];
      
      const voteCheck = await query(
        'SELECT id, selected_option FROM poll_votes WHERE poll_id = $1 AND ticket_id = $2 LIMIT 1',
        [activePoll.id, ticketId]
      );
      
      if (voteCheck.rows.length > 0) {
        hasVoted = true;
        activePoll.user_vote = voteCheck.rows[0].selected_option;
      }
    }

    const cluesRes = await query(
      'SELECT id, title, content, image_url FROM event_clues WHERE event_id = $1 AND is_revealed = TRUE ORDER BY created_at DESC',
      [eventId]
    );

    res.json({
      status: 'OK',
      poll: activePoll,
      has_voted: hasVoted,
      clues: cluesRes.rows
    });

  } catch (err) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al obtener estado de interactividad.',
      error: err.message
    });
  }
};

// 2. Registrar voto de boleto oficial
exports.submitVote = async (req, res) => {
  const { pollId, scheduleId, ticketId, option } = req.body;

  if (!pollId || !scheduleId || !ticketId || !option) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'Faltan campos para registrar el voto.'
    });
  }

  try {
    await query(
      'INSERT INTO poll_votes (poll_id, schedule_id, ticket_id, selected_option) VALUES ($1, $2, $3, $4)',
      [pollId, scheduleId, ticketId, option]
    );

    res.json({
      status: 'OK',
      message: 'Voto registrado correctamente.'
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({
        status: 'ERROR',
        message: 'Ya has registrado tu voto para esta pregunta.'
      });
    }
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al registrar el voto.',
      error: err.message
    });
  }
};

// ===============================================
// NUEVO: LÓGICA DE INTERACTIVIDAD PÚBLICA (QR GENERAL DE SALA)
// ===============================================

// 3. Obtener estado de interactividad para QR General
exports.getPublicLiveInteraction = async (req, res) => {
  const { scheduleId, voterId } = req.params;

  try {
    // Obtener evento y datos de la función
    const scheduleRes = await query(
      `SELECT es.id, es.schedule_time, e.id as event_id, e.title, e.banner_url 
       FROM event_schedules es
       JOIN events e ON e.id = es.event_id
       WHERE es.id = $1`,
      [scheduleId]
    );

    if (scheduleRes.rows.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        message: 'Función no encontrada.'
      });
    }

    const schedule = scheduleRes.rows[0];

    // Buscar encuesta activa
    const activePollRes = await query(
      'SELECT id, question, options FROM event_polls WHERE event_id = $1 AND is_active = TRUE LIMIT 1',
      [schedule.event_id]
    );

    let activePoll = null;
    let hasVoted = false;

    if (activePollRes.rows.length > 0) {
      activePoll = activePollRes.rows[0];
      
      // Consultar si este voterId anónimo ya votó
      const voteCheck = await query(
        'SELECT id, selected_option FROM poll_votes WHERE poll_id = $1 AND voter_id = $2 LIMIT 1',
        [activePoll.id, voterId]
      );
      
      if (voteCheck.rows.length > 0) {
        hasVoted = true;
        activePoll.user_vote = voteCheck.rows[0].selected_option;
      }
    }

    // Buscar pistas reveladas
    const cluesRes = await query(
      'SELECT id, title, content, image_url FROM event_clues WHERE event_id = $1 AND is_revealed = TRUE ORDER BY created_at DESC',
      [schedule.event_id]
    );

    res.json({
      status: 'OK',
      event: {
        title: schedule.title,
        banner_url: schedule.banner_url,
        schedule_time: schedule.schedule_time
      },
      poll: activePoll,
      has_voted: hasVoted,
      clues: cluesRes.rows
    });

  } catch (err) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al obtener datos interactivos de la sala.',
      error: err.message
    });
  }
};

// 4. Registrar voto anónimo de sala
exports.submitPublicVote = async (req, res) => {
  const { pollId, scheduleId, voterId, option } = req.body;

  if (!pollId || !scheduleId || !voterId || !option) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'Faltan campos para registrar el voto de sala.'
    });
  }

  try {
    await query(
      'INSERT INTO poll_votes (poll_id, schedule_id, voter_id, selected_option) VALUES ($1, $2, $3, $4)',
      [pollId, scheduleId, voterId, option]
    );

    res.json({
      status: 'OK',
      message: 'Tu voto ha sido sumado correctamente.'
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({
        status: 'ERROR',
        message: 'Tu dispositivo ya ha enviado un voto para esta pregunta.'
      });
    }
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al registrar el voto de la sala.',
      error: err.message
    });
  }
};

// ===============================================
// MÉTODOS DE ADMINISTRADOR DE INTERACTIVIDAD
// ===============================================

// 5. Obtener listado para Admin/Staff
exports.getAdminInteractions = async (req, res) => {
  const { eventId, scheduleId } = req.params;

  try {
    const pollsRes = await query(
      'SELECT * FROM event_polls WHERE event_id = $1 ORDER BY created_at ASC',
      [eventId]
    );
    const polls = pollsRes.rows;

    for (let poll of polls) {
      const votesRes = await query(
        `SELECT selected_option, COUNT(*)::integer as votes_count
         FROM poll_votes 
         WHERE poll_id = $1 AND schedule_id = $2
         GROUP BY selected_option`,
        [poll.id, scheduleId]
      );
      poll.votes = votesRes.rows;
    }

    const cluesRes = await query(
      'SELECT * FROM event_clues WHERE event_id = $1 ORDER BY created_at ASC',
      [eventId]
    );

    res.json({
      status: 'OK',
      polls,
      clues: cluesRes.rows
    });

  } catch (err) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al obtener interacciones de administración.',
      error: err.message
    });
  }
};

// 6. Alternar/Activar una encuesta
exports.togglePollStatus = async (req, res) => {
  const { eventId, pollId, isActive } = req.body;

  try {
    if (isActive) {
      await query('UPDATE event_polls SET is_active = FALSE WHERE event_id = $1', [eventId]);
    }

    await query('UPDATE event_polls SET is_active = $1 WHERE id = $2', [isActive, pollId]);

    res.json({
      status: 'OK',
      message: `Encuesta ${isActive ? 'activada' : 'desactivada'} correctamente.`
    });
  } catch (err) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al alternar estado de la encuesta.',
      error: err.message
    });
  }
};

// 7. Revelar u ocultar una pista
exports.revealClue = async (req, res) => {
  const { clueId, isRevealed } = req.body;

  try {
    await query('UPDATE event_clues SET is_revealed = $1 WHERE id = $2', [isRevealed, clueId]);

    res.json({
      status: 'OK',
      message: `Pista ${isRevealed ? 'revelada' : 'ocultada'} con éxito.`
    });
  } catch (err) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al alternar estado de la pista.',
      error: err.message
    });
  }
};

// Momento WOW anterior (Standby)
exports.sendMassPista = async (req, res) => {
  res.json({
    status: 'OK',
    message: 'Esta funcionalidad de WhatsApp se encuentra desactivada temporalmente (Stand-by).'
  });
};
