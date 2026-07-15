const { query } = require('../config/db');
const { sendTicketEmail, sendPendingTransferEmail } = require('../services/emailService');

/**
 * Reenvía correos a todos los clientes que no los recibieron.
 * - Órdenes "Pagado" / "Cortesía" → envía e-ticket con QR
 * - Órdenes "Pendiente"           → envía correo de reserva pendiente
 * - Órdenes "Anulado"             → se omiten
 *
 * Solo accesible para admins. Acepta query param ?dry_run=true para
 * simular sin enviar realmente.
 */
exports.resendPendingEmails = async (req, res) => {
  const dryRun = req.query.dry_run === 'true';

  try {
    // Obtener todas las órdenes no anuladas que tengan email válido
    const ordersRes = await query(`
      SELECT
        o.*,
        e.title        AS event_title,
        e.venue        AS event_venue,
        e.is_single_rate,
        es.schedule_time
      FROM orders o
      JOIN events        e  ON e.id  = o.event_id
      JOIN event_schedules es ON es.id = o.schedule_id
      WHERE o.payment_status != 'Anulado'
        AND o.customer_email IS NOT NULL
        AND o.customer_email <> ''
        AND o.customer_email LIKE '%@%'
      ORDER BY o.created_at ASC
    `);

    const orders = ordersRes.rows;
    const results = [];

    for (const order of orders) {
      const totalQty = order.ticket_count_adult + order.ticket_count_child;
      let desglose = order.is_single_rate
        ? `${totalQty} Entradas`
        : `${order.ticket_count_adult} Ad / ${order.ticket_count_child} Ni`;

      // Buscar tickets de la orden
      const ticketsRes = await query(
        'SELECT * FROM tickets WHERE order_id = $1 ORDER BY id ASC',
        [order.id]
      );
      const tickets = ticketsRes.rows;

      const seatLabels = tickets.map(t => t.seat_label).filter(Boolean);
      if (seatLabels.length > 0) {
        desglose += ` [Asientos: ${seatLabels.join(', ')}]`;
      }

      const emailData = {
        email:         order.customer_email,
        customerName:  order.customer_name,
        orderNum:      order.order_num,
        eventTitle:    order.event_title,
        eventVenue:    order.event_venue,
        scheduleTime:  order.schedule_time,
        ticketCount:   totalQty,
        ticketDesglose: desglose,
      };

      let tipo = '';
      let success = false;

      try {
        if (order.payment_status === 'Pendiente') {
          tipo = 'pendiente';
          if (!dryRun) {
            success = await sendPendingTransferEmail({
              ...emailData,
              amountTotal: order.amount_total
            });
          } else {
            success = true; // simulación
          }
        } else {
          // Pagado o Cortesía → enviar e-ticket
          tipo = 'ticket';
          if (tickets.length === 0) {
            results.push({
              order_num: order.order_num,
              email: order.customer_email,
              status: 'SIN_TICKETS',
              tipo,
              dry_run: dryRun
            });
            continue;
          }
          if (!dryRun) {
            success = await sendTicketEmail({
              ...emailData,
              tickets
            });
          } else {
            success = true; // simulación
          }
        }

        results.push({
          order_num:  order.order_num,
          email:      order.customer_email,
          status:     success ? 'ENVIADO' : 'ERROR',
          tipo,
          payment_status: order.payment_status,
          dry_run:    dryRun
        });

      } catch (emailErr) {
        results.push({
          order_num:  order.order_num,
          email:      order.customer_email,
          status:     'ERROR',
          error:      emailErr.message,
          tipo,
          payment_status: order.payment_status,
          dry_run:    dryRun
        });
      }

      // Pequeña pausa para no saturar el servidor SMTP
      if (!dryRun) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    const enviados  = results.filter(r => r.status === 'ENVIADO').length;
    const errores   = results.filter(r => r.status === 'ERROR').length;
    const sinTicket = results.filter(r => r.status === 'SIN_TICKETS').length;

    res.json({
      status:    'OK',
      dry_run:   dryRun,
      total:     orders.length,
      enviados,
      errores,
      sin_ticket: sinTicket,
      detalle:   results
    });

  } catch (err) {
    console.error('Error en resendPendingEmails:', err);
    res.status(500).json({
      status:  'ERROR',
      message: 'Error al procesar el reenvío de correos',
      error:   err.message
    });
  }
};
