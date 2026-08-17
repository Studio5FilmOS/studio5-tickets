const { query, pool } = require('../config/db');
const { sendTicketEmail, sendPendingTransferEmail } = require('../services/emailService');
const { sendPushToAdmins } = require('../services/pushService');
const { sendWhatsAppTicketWebhook } = require('../services/whatsappService');
const { verifyTransaction: verifyPayphoneGateway } = require('../services/payphoneService');
const fs = require('fs');
const path = require('path');

const PLATFORM_FEE_PER_TICKET = parseFloat(process.env.PLATFORM_FEE_PER_TICKET || '0.50');

// Helper para guardar el comprobante de transferencia desde Base64
const saveReceiptFile = (base64Data) => {
  if (!base64Data) return null;
  if (!base64Data.startsWith('data:')) return null;

  try {
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Formato base64 inválido');
    }

    const fileType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    
    let extension = 'jpg';
    if (fileType.includes('png')) extension = 'png';
    else if (fileType.includes('pdf')) extension = 'pdf';
    else if (fileType.includes('jpeg')) extension = 'jpg';
    
    const fileName = `recibo-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}.${extension}`;
    const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'receipts');
    
    fs.mkdirSync(uploadDir, { recursive: true });
    
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, buffer);
    
    return `/uploads/receipts/${fileName}`;
  } catch (err) {
    console.error('Error al guardar comprobante de transferencia:', err);
    return null;
  }
};

// Crear una venta o reserva
exports.createOrder = async (req, res) => {
  const {
    idEvento, fecha: scheduleId, nombre, email, whatsapp,
    cantAdultos, cantNinos, tipoVenta, metodoPago, banco, numTransaccion,
    seat_labels, clientTxId, localidad_id,
    // Campos de facturación
    is_final_consumer, billing_id_number, billing_name, billing_address, billing_email,
    comprobante
  } = req.body;

  // Validación de campos básicos
  if (!idEvento || !scheduleId || !nombre) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'Faltan campos obligatorios para registrar la venta.'
    });
  }

  const cAd = parseInt(cantAdultos) || 0;
  const cNi = parseInt(cantNinos) || 0;
  let totalQty = cAd + cNi;

  if (totalQty <= 0 && (!seat_labels || seat_labels.length === 0)) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'La cantidad total de entradas debe ser mayor a 0.'
    });
  }

  if (totalQty <= 0 && seat_labels && seat_labels.length > 0) {
    totalQty = seat_labels.length;
  }

  // Si es transferencia y es comprador público, exigir comprobante
  const isTransfer = metodoPago && (metodoPago === 'Transferencia' || metodoPago === 'Transferencia Bancaria' || metodoPago.startsWith('Transf'));
  const isPublic = !req.user || req.user.role === 'buyer';
  if (isTransfer && isPublic && !comprobante) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'El comprobante de pago es obligatorio para procesar la transferencia bancaria.'
    });
  }

  const client = await pool.connect();

  try {
    // Iniciar transacción SQL para control de concurrencia y aforos
    await client.query('BEGIN');

    // 1. Obtener evento con bloqueo de fila
    const eventRes = await client.query('SELECT * FROM events WHERE id = $1 FOR UPDATE', [idEvento]);
    if (eventRes.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ status: 'ERROR', message: 'Evento no encontrado.' });
    }
    const event = eventRes.rows[0];

    // 2. Verificar existencia de la función
    const scheduleRes = await client.query('SELECT * FROM event_schedules WHERE id = $1 AND event_id = $2', [scheduleId, idEvento]);
    if (scheduleRes.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ status: 'ERROR', message: 'La función especificada no existe para este evento.' });
    }
    const schedule = scheduleRes.rows[0];

    // 3. Manejo de Localidad y Control de Concurrencia (Anti-Sobrevuelos)
    let targetLocalidad = null;
    if (localidad_id) {
      const locRes = await client.query(
        'SELECT * FROM localidades WHERE id = $1 AND event_id = $2 FOR UPDATE',
        [localidad_id, idEvento]
      );
      if (locRes.rows.length === 0) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(404).json({ status: 'ERROR', message: 'La localidad seleccionada no existe para este evento.' });
      }
      targetLocalidad = locRes.rows[0];

      if (targetLocalidad.aforo_disponible < totalQty) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(400).json({
          status: 'ERROR',
          message: `Aforo insuficiente en la localidad "${targetLocalidad.nombre}". Solo quedan ${targetLocalidad.aforo_disponible} disponibles.`
        });
      }

      // Restar disponibilidad en la localidad seleccionada de forma atómica
      await client.query(
        'UPDATE localidades SET aforo_disponible = aforo_disponible - $1, updated_at = NOW() WHERE id = $2',
        [totalQty, targetLocalidad.id]
      );
    }

    // 4. Validación de asientos numerados (si aplica)
    if (event.has_assigned_seats) {
      if (!seat_labels || !Array.isArray(seat_labels) || seat_labels.length !== totalQty) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(400).json({
          status: 'ERROR',
          message: `Debes seleccionar exactamente ${totalQty} butacas para este evento.`
        });
      }

      for (let seat of seat_labels) {
        const layout = event.seating_layout;
        const isSeatValid = Array.isArray(layout)
          ? (Array.isArray(layout[0]) ? layout.flat().includes(seat) : layout.includes(seat))
          : false;
        if (layout && !isSeatValid) {
          await client.query('ROLLBACK');
          client.release();
          return res.status(400).json({
            status: 'ERROR',
            message: `El asiento "${seat}" no existe en la sala.`
          });
        }

        const seatCheck = await client.query(
          `SELECT t.id FROM tickets t
           JOIN orders o ON o.id = t.order_id
           WHERE o.schedule_id = $1 AND o.payment_status != 'Anulado' AND t.seat_label = $2`,
          [scheduleId, seat]
        );

        if (seatCheck.rows.length > 0) {
          await client.query('ROLLBACK');
          client.release();
          return res.status(400).json({
            status: 'ERROR',
            message: `El asiento "${seat}" ya se encuentra reservado.`
          });
        }
      }
    } else if (!targetLocalidad) {
      // Si no usa localidades pero es aforo general
      const soldRes = await client.query(
        `SELECT COALESCE(SUM(ticket_count_adult + ticket_count_child), 0)::integer as sold
         FROM orders WHERE schedule_id = $1 AND payment_status != 'Anulado'`,
        [scheduleId]
      );
      const soldTickets = soldRes.rows[0].sold;
      const availableCapacity = event.capacity_total - soldTickets;

      if (totalQty > availableCapacity) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(400).json({
          status: 'ERROR',
          message: `Aforo general insuficiente. Solo quedan ${availableCapacity} entradas disponibles.`
        });
      }
    }

    // 5. Calcular Precios Netos
    let promoActiva = false;
    if (event.promo_type !== 'Ninguna') {
      if (!event.promo_deadline) promoActiva = true;
      else if (new Date() <= new Date(event.promo_deadline)) promoActiva = true;
    }

    let precioNeto = 0;
    if (targetLocalidad) {
      // Precio dictado por la localidad
      const baseLocPrice = parseFloat(targetLocalidad.precio);
      precioNeto = totalQty * baseLocPrice;
    } else if (event.is_single_rate) {
      const priceUnit = promoActiva && event.promo_type === 'Preventa' ? event.price_promo : event.price_adult;
      if (promoActiva && event.promo_type === '2x1') {
        precioNeto = ((Math.floor(totalQty / 2) * event.price_adult) + ((totalQty % 2) * event.price_adult));
      } else {
        precioNeto = totalQty * priceUnit;
      }
    } else {
      const priceAd = promoActiva && event.promo_type === 'Preventa' ? event.price_promo : event.price_adult;
      const priceNi = event.price_child;

      if (promoActiva && event.promo_type === '2x1') {
        precioNeto = ((Math.floor(cAd / 2) * event.price_adult) + ((cAd % 2) * event.price_adult)) + (cNi * priceNi);
      } else {
        precioNeto = (cAd * priceAd) + (cNi * priceNi);
      }
    }

    const operation = tipoVenta || 'Venta';
    let finalAmount = operation === 'Cortesia' ? 0.00 : precioNeto;

    // Recargo Payphone si aplica
    if (metodoPago === 'Payphone' && operation === 'Venta') {
      const surchargeEnable = process.env.PAYPHONE_SURCHARGE_ENABLE !== 'false';
      if (surchargeEnable) {
        const rate = parseFloat(process.env.PAYPHONE_SURCHARGE_RATE) || 0.043;
        const fixed = parseFloat(process.env.PAYPHONE_SURCHARGE_FIXED) || 0.30;
        const rawTotal = (precioNeto + fixed) / (1 - rate);
        finalAmount = Math.round(rawTotal * 100) / 100;
      }
    }

    // Generar código de orden único
    const timestamp = Date.now();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const orderNum = `ORD-${timestamp}-${rand}`;

    // Verificación Payphone para cobros online
    if (metodoPago === 'Payphone' && operation === 'Venta') {
      if (!numTransaccion) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(400).json({
          status: 'ERROR',
          message: 'Se requiere el ID de transacción de Payphone para verificar el cobro.'
        });
      }

      const isApproved = await verifyPayphoneGateway(numTransaccion, clientTxId || orderNum);
      if (!isApproved) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(400).json({
          status: 'ERROR',
          message: 'Transacción Payphone no aprobada o inválida. Por favor intenta de nuevo.'
        });
      }
    }

    let paymentStatus = 'Pending';
    const userRole = req.user ? req.user.role : null;
    
    if (operation === 'Cortesia') {
      paymentStatus = 'Cortesía';
    } else if (isTransfer) {
      paymentStatus = (userRole === 'admin') ? 'Pagado' : 'Pendiente';
    } else if (operation === 'Venta') {
      paymentStatus = 'Pagado';
    }

    let comprobanteUrl = null;
    if (comprobante) {
      comprobanteUrl = saveReceiptFile(comprobante);
    }

    // Desglose descriptivo
    let desglose = targetLocalidad ? `${totalQty}x ${targetLocalidad.nombre}` : (event.is_single_rate ? `${totalQty} Entradas` : `${cAd} Ad / ${cNi} Ni`);
    if (event.has_assigned_seats && seat_labels) {
      desglose += ` [Asientos: ${seat_labels.join(', ')}]`;
    }

    const localidadBreakdown = targetLocalidad ? {
      localidad_id: targetLocalidad.id,
      nombre: targetLocalidad.nombre,
      precio: targetLocalidad.precio,
      cantidad: totalQty
    } : null;

    const cleanWhatsapp = whatsapp ? (whatsapp.startsWith('+') ? '+' + whatsapp.replace(/\D/g, '') : whatsapp.replace(/\D/g, '')) : null;
    const buyerId = req.user ? req.user.id : null;

    // 6. Insertar la Orden
    const orderInsertRes = await client.query(
      `INSERT INTO orders 
       (order_num, buyer_id, customer_name, customer_email, customer_whatsapp, event_id, schedule_id, operation_type, payment_method, payment_status, amount_total, amount_net, ticket_count_adult, ticket_count_child, localidad_breakdown, transaction_ref, bank_name, is_final_consumer, billing_id_number, billing_name, billing_address, billing_email, comprobante_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
       RETURNING *`,
      [
        orderNum, buyerId, nombre, email || null, cleanWhatsapp, idEvento, scheduleId,
        operation, metodoPago || 'Efectivo', paymentStatus, finalAmount, operation === 'Cortesia' ? 0.00 : precioNeto,
        targetLocalidad ? totalQty : cAd, targetLocalidad ? 0 : cNi,
        localidadBreakdown ? JSON.stringify(localidadBreakdown) : null,
        numTransaccion || null, banco || null,
        is_final_consumer !== false, billing_id_number || null, billing_name || null, billing_address || null, billing_email || null,
        comprobanteUrl
      ]
    );
    const newOrder = orderInsertRes.rows[0];

    // 7. Crear tickets individuales
    const createdTickets = [];
    for (let idx = 0; idx < totalQty; idx++) {
      const ticketCode = `TKT-${timestamp}-${idx + 1}`;
      const seat = event.has_assigned_seats ? seat_labels[idx] : null;
      const type = targetLocalidad ? targetLocalidad.nombre : (event.is_single_rate ? 'General' : (idx < cAd ? 'Adulto' : 'Niño'));

      const ticketInsertRes = await client.query(
        `INSERT INTO tickets (order_id, localidad_id, ticket_code, ticket_type, seat_label, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [newOrder.id, targetLocalidad?.id || null, ticketCode, type, seat, 'Active']
      );
      createdTickets.push(ticketInsertRes.rows[0]);
    }

    // 8. Si el evento pertenece a un organizador y la orden está pagada, sumar tarifa por ticket a su deuda
    if (event.organizer_id && paymentStatus === 'Pagado') {
      let billableTickets = totalQty;
      if (operation === 'Cortesia') {
        const courtesyCountRes = await client.query(
          `SELECT COALESCE(SUM(ticket_count_adult + ticket_count_child), 0)::integer as total_courtesies
           FROM orders 
           WHERE schedule_id = $1 AND operation_type = 'Cortesia' AND payment_status != 'Anulado' AND id != $2`,
          [scheduleId, newOrder.id]
        );
        const previousCourtesies = courtesyCountRes.rows[0].total_courtesies;
        const FREE_COURTESY_LIMIT = 4;
        const freeSpotsRemaining = Math.max(0, FREE_COURTESY_LIMIT - previousCourtesies);
        billableTickets = Math.max(0, totalQty - freeSpotsRemaining);
      }

      if (billableTickets > 0) {
        const debtAddition = billableTickets * PLATFORM_FEE_PER_TICKET;
        await client.query(
          'UPDATE users SET debt_balance = debt_balance + $1, updated_at = NOW() WHERE id = $2',
          [debtAddition, event.organizer_id]
        );
      }
    }

    await client.query('COMMIT');
    client.release();

    // 9. Despacho Asíncrono de Notificaciones (Email, Push, WhatsApp Bot)
    const hostUrl = process.env.FRONTEND_URL || 'https://studio5tickets.com';
    const ticketUrl = `${hostUrl}/boleto/${createdTickets[0]?.ticket_code || newOrder.order_num}`;

    if (paymentStatus === 'Pendiente' && email && email.includes('@')) {
      sendPendingTransferEmail({
        email,
        customerName: nombre,
        orderNum: newOrder.order_num,
        eventTitle: event.title,
        eventVenue: event.venue,
        scheduleTime: schedule.schedule_time,
        ticketCount: totalQty,
        ticketDesglose: desglose,
        amountTotal: finalAmount
      }).catch(err => console.error('Error al enviar email de transferencia pendiente:', err));

      sendPushToAdmins(
        '🧾 Comprobante por revisar',
        `${nombre} envió un comprobante por $${finalAmount.toFixed(2)} — ${event.title}`,
        { tag: 'transfer-pending', url: '/admin?tab=transferencias' }
      ).catch(() => {});

    } else if (paymentStatus === 'Pagado') {
      if (email && email.includes('@')) {
        sendTicketEmail({
          email,
          customerName: nombre,
          orderNum: newOrder.order_num,
          eventTitle: event.title,
          eventVenue: event.venue,
          scheduleTime: schedule.schedule_time,
          ticketCount: totalQty,
          ticketDesglose: desglose,
          tickets: createdTickets
        }).catch(err => console.error('Error al enviar email:', err));
      }

      // WhatsApp Webhook hacia n8n + Whapi
      if (cleanWhatsapp) {
        sendWhatsAppTicketWebhook({
          numero_whatsapp_cliente: cleanWhatsapp,
          nombre_cliente: nombre,
          nombre_evento: event.title,
          url_del_ticket_pdf_o_qr: ticketUrl,
          orden_numero: newOrder.order_num,
          total: finalAmount,
          localidad: targetLocalidad?.nombre || 'General'
        }).catch(err => console.error('Error en webhook de WhatsApp:', err));
      }

      sendPushToAdmins(
        '💳 Venta confirmada',
        `${nombre} compró ${totalQty} entrada(s) para ${event.title} — $${finalAmount.toFixed(2)}`,
        { tag: 'new-sale', url: '/admin?tab=ventas' }
      ).catch(() => {});
    }

    res.status(201).json({
      status: 'OK',
      order: newOrder,
      tickets: createdTickets,
      evento: {
        title: event.title,
        venue: event.venue,
        banner_url: event.banner_url,
        ticket_template_url: event.ticket_template_url
      },
      schedule_time: schedule.schedule_time
    });

  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    console.error('Error in createOrder:', err);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al registrar la venta: ' + err.message,
      error: err.message
    });
  }
};

// Listar todas las órdenes
exports.getAllOrders = async (req, res) => {
  const user = req.user;
  const isOrganizer = user && user.role === 'organizer';

  try {
    const { event_id, schedule_id, date_from, date_to } = req.query;
    const conditions = [];
    const params = [];

    if (isOrganizer) {
      params.push(user.id);
      conditions.push(`e.organizer_id = $${params.length}`);
    }

    if (event_id) { params.push(event_id); conditions.push(`o.event_id = $${params.length}`); }
    if (schedule_id) { params.push(schedule_id); conditions.push(`o.schedule_id = $${params.length}`); }
    if (date_from) { params.push(date_from); conditions.push(`o.created_at >= $${params.length}::date`); }
    if (date_to) { params.push(date_to); conditions.push(`o.created_at < ($${params.length}::date + interval '1 day')`); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const ordersRes = await query(
      `SELECT o.*, e.title as event_title, es.schedule_time,
       (SELECT COUNT(*)::integer FROM tickets t WHERE t.order_id = o.id AND t.status = 'Used') as checked_in_count
       FROM orders o
       JOIN events e ON e.id = o.event_id
       JOIN event_schedules es ON es.id = o.schedule_id
       ${whereClause}
       ORDER BY o.created_at DESC`,
      params
    );

    res.json({ status: 'OK', orders: ordersRes.rows });
  } catch (err) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al obtener el historial de ventas',
      error: err.message
    });
  }
};

// Obtener detalle de una orden y sus tickets
exports.getOrderById = async (req, res) => {
  const { id } = req.params;

  try {
    const orderRes = await query(
      `SELECT o.*, e.title as event_title, e.venue as event_venue, e.banner_url, e.ticket_template_url, es.schedule_time
       FROM orders o
       JOIN events e ON e.id = o.event_id
       JOIN event_schedules es ON es.id = o.schedule_id
       WHERE o.id = $1`,
      [id]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ status: 'ERROR', message: 'Orden no encontrada.' });
    }

    const order = orderRes.rows[0];
    const ticketsRes = await query('SELECT * FROM tickets WHERE order_id = $1 ORDER BY id ASC', [id]);

    res.json({
      status: 'OK',
      order,
      tickets: ticketsRes.rows
    });
  } catch (err) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al obtener la orden',
      error: err.message
    });
  }
};

// Obtener detalle de una orden por order_num (Público)
exports.getOrderByNum = async (req, res) => {
  const { orderNum } = req.params;

  try {
    const orderRes = await query(
      `SELECT o.*, e.title as event_title, e.venue as event_venue, e.banner_url, e.ticket_template_url, es.schedule_time
       FROM orders o
       JOIN events e ON e.id = o.event_id
       JOIN event_schedules es ON es.id = o.schedule_id
       WHERE o.order_num = $1`,
      [orderNum]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ status: 'ERROR', message: 'Orden no encontrada.' });
    }

    const order = orderRes.rows[0];
    const ticketsRes = await query('SELECT * FROM tickets WHERE order_id = $1 ORDER BY id ASC', [order.id]);

    res.json({
      status: 'OK',
      order,
      tickets: ticketsRes.rows
    });
  } catch (err) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al obtener la orden',
      error: err.message
    });
  }
};

// Actualizar estado de pago/operación de la orden
exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { payment_status } = req.body;

  if (!payment_status || !['Pagado', 'Pendiente', 'Anulado'].includes(payment_status)) {
    return res.status(400).json({ status: 'ERROR', message: 'Estado de pago inválido.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const orderRes = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [id]);
    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ status: 'ERROR', message: 'Orden no encontrada.' });
    }
    const order = orderRes.rows[0];

    if (payment_status === 'Anulado') {
      await client.query("UPDATE tickets SET status = 'Cancelled' WHERE order_id = $1", [id]);
    } else if (order.payment_status === 'Anulado' && payment_status !== 'Anulado') {
      await client.query("UPDATE tickets SET status = 'Active' WHERE order_id = $1", [id]);
    }

    const updateRes = await client.query(
      "UPDATE orders SET payment_status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [payment_status, id]
    );
    const updatedOrder = updateRes.rows[0];

    const ticketsRes = await client.query('SELECT * FROM tickets WHERE order_id = $1', [id]);
    const tickets = ticketsRes.rows;

    // Si pasa a Pagado y el evento es de un organizador, sumar deuda de plataforma
    if (payment_status === 'Pagado' && order.payment_status !== 'Pagado') {
      const eventRes = await client.query('SELECT * FROM events WHERE id = $1', [order.event_id]);
      const event = eventRes.rows[0];
      if (event && event.organizer_id) {
        let billableTickets = order.ticket_count_adult + order.ticket_count_child || tickets.length;
        if (order.operation_type === 'Cortesia') {
          const courtesyCountRes = await client.query(
            `SELECT COALESCE(SUM(ticket_count_adult + ticket_count_child), 0)::integer as total_courtesies
             FROM orders 
             WHERE schedule_id = $1 AND operation_type = 'Cortesia' AND payment_status = 'Pagado' AND id != $2`,
            [order.schedule_id, id]
          );
          const previousCourtesies = courtesyCountRes.rows[0].total_courtesies;
          const FREE_COURTESY_LIMIT = 4;
          const freeSpotsRemaining = Math.max(0, FREE_COURTESY_LIMIT - previousCourtesies);
          billableTickets = Math.max(0, billableTickets - freeSpotsRemaining);
        }
        if (billableTickets > 0) {
          const fee = billableTickets * PLATFORM_FEE_PER_TICKET;
          await client.query('UPDATE users SET debt_balance = debt_balance + $1 WHERE id = $2', [fee, event.organizer_id]);
        }
      }
    }

    await client.query('COMMIT');
    client.release();

    // Notificaciones al aprobar
    if (payment_status === 'Pagado' && order.payment_status !== 'Pagado') {
      const eventRes = await query('SELECT * FROM events WHERE id = $1', [order.event_id]);
      const scheduleRes = await query('SELECT * FROM event_schedules WHERE id = $1', [order.schedule_id]);

      if (eventRes.rows.length > 0 && scheduleRes.rows.length > 0) {
        const event = eventRes.rows[0];
        const schedule = scheduleRes.rows[0];
        const totalQty = order.ticket_count_adult + order.ticket_count_child || tickets.length;
        let desglose = event.is_single_rate ? `${totalQty} Entradas` : `${order.ticket_count_adult} Ad / ${order.ticket_count_child} Ni`;
        
        const seatLabels = tickets.map(t => t.seat_label).filter(Boolean);
        if (seatLabels.length > 0) desglose += ` [Asientos: ${seatLabels.join(', ')}]`;

        if (order.customer_email) {
          sendTicketEmail({
            email: order.customer_email,
            customerName: order.customer_name,
            orderNum: order.order_num,
            eventTitle: event.title,
            eventVenue: event.venue,
            scheduleTime: schedule.schedule_time,
            ticketCount: totalQty,
            ticketDesglose: desglose,
            tickets: tickets
          }).catch(err => console.error('Error al enviar email al actualizar orden:', err));
        }

        // WhatsApp Webhook a n8n
        if (order.customer_whatsapp) {
          const hostUrl = process.env.FRONTEND_URL || 'https://studio5tickets.com';
          const ticketUrl = `${hostUrl}/boleto/${tickets[0]?.ticket_code || order.order_num}`;
          sendWhatsAppTicketWebhook({
            numero_whatsapp_cliente: order.customer_whatsapp,
            nombre_cliente: order.customer_name,
            nombre_evento: event.title,
            url_del_ticket_pdf_o_qr: ticketUrl,
            orden_numero: order.order_num,
            total: order.amount_total,
            localidad: order.localidad_breakdown?.nombre || 'General'
          }).catch(err => console.error('Error al enviar WhatsApp Webhook:', err));
        }
      }
    }

    res.json({
      status: 'OK',
      message: `Orden actualizada a ${payment_status}.`,
      order: updatedOrder,
      tickets
    });

  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al actualizar el estado de la orden',
      error: err.message
    });
  }
};

// Actualizar detalles de facturación/datos de comprador
exports.updateOrder = async (req, res) => {
  const { id } = req.params;
  const {
    customer_name,
    customer_email,
    customer_whatsapp,
    is_final_consumer,
    billing_id_number,
    billing_name,
    billing_address,
    billing_email
  } = req.body;

  try {
    const updateRes = await query(
      `UPDATE orders SET 
        customer_name = COALESCE($1, customer_name),
        customer_email = COALESCE($2, customer_email),
        customer_whatsapp = COALESCE($3, customer_whatsapp),
        is_final_consumer = COALESCE($4, is_final_consumer),
        billing_id_number = COALESCE($5, billing_id_number),
        billing_name = COALESCE($6, billing_name),
        billing_address = COALESCE($7, billing_address),
        billing_email = COALESCE($8, billing_email),
        updated_at = NOW()
       WHERE id = $9 RETURNING *`,
      [
        customer_name, customer_email, customer_whatsapp, 
        is_final_consumer, billing_id_number, billing_name, billing_address, billing_email,
        id
      ]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ status: 'ERROR', message: 'Orden no encontrada.' });
    }

    res.json({
      status: 'OK',
      message: 'Orden actualizada correctamente.',
      order: updateRes.rows[0]
    });
  } catch (err) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al actualizar la orden',
      error: err.message
    });
  }
};

// Subir comprobante a una orden existente
exports.uploadReceipt = async (req, res) => {
  const { id } = req.params;
  const { comprobanteBase64 } = req.body;

  if (!comprobanteBase64) {
    return res.status(400).json({ status: 'ERROR', message: 'No se envió un comprobante válido.' });
  }

  try {
    const comprobanteUrl = saveReceiptFile(comprobanteBase64);
    if (!comprobanteUrl) {
      return res.status(500).json({ status: 'ERROR', message: 'Error al procesar el archivo del comprobante.' });
    }

    const updateRes = await query(
      "UPDATE orders SET comprobante_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [comprobanteUrl, id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ status: 'ERROR', message: 'Orden no encontrada.' });
    }

    res.json({
      status: 'OK',
      message: 'Comprobante subido exitosamente.',
      order: updateRes.rows[0]
    });
  } catch (err) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al subir el comprobante',
      error: err.message
    });
  }
};
