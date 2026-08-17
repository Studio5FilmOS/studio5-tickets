const { query } = require('../config/db');
const { chargeWithCardToken, calculateTotalWithGatewayFee } = require('./payphoneService');
const { sendPushToAdmins } = require('./pushService');

const BATCH_BILLING_THRESHOLD = parseFloat(process.env.BATCH_BILLING_THRESHOLD || '50.00');
const PLATFORM_FEE_PER_TICKET = parseFloat(process.env.PLATFORM_FEE_PER_TICKET || '0.50');

/**
 * Tarea 1: Cobro por Lotes (Batch Billing)
 * Revisa organizadores cuya deuda acumulada alcance o supere el umbral ($50.00)
 * y realiza el débito automático sobre su token de tarjeta Payphone.
 */
const runBatchBillingJob = async () => {
  console.log('🔄 [Batch Billing] Ejecutando verificación de deudas acumuladas...');
  try {
    const organizersRes = await query(
      `SELECT id, name, email, token_tarjeta, debt_balance 
       FROM users 
       WHERE role = 'organizer' AND debt_balance >= $1 AND token_tarjeta IS NOT NULL`,
      [BATCH_BILLING_THRESHOLD]
    );

    for (const org of organizersRes.rows) {
      const netDebt = parseFloat(org.debt_balance);
      const grossCharge = calculateTotalWithGatewayFee(netDebt);
      const amountInCents = Math.round(grossCharge * 100);
      const clientTxId = `BATCH-${org.id.slice(0, 8)}-${Date.now()}`;

      console.log(`💳 [Batch Billing] Procesando cobro para ${org.name} (${org.email}). Deuda neta: $${netDebt.toFixed(2)}, Cargo bruto con recargo: $${grossCharge.toFixed(2)}`);

      try {
        const result = await chargeWithCardToken({
          cardToken: org.token_tarjeta,
          amountInCents,
          clientTxId,
          email: org.email
        });

        if (result.success) {
          // Descontar la deuda liquidada
          await query(
            'UPDATE users SET debt_balance = debt_balance - $1, updated_at = NOW() WHERE id = $2',
            [netDebt, org.id]
          );

          console.log(`✅ [Batch Billing] Cobro por lote exitoso para ${org.name}. Saldo regularizado.`);

          sendPushToAdmins(
            '💳 Cobro por Lote Exitoso',
            `Se cobraron $${grossCharge.toFixed(2)} al organizador ${org.name} (Deuda neta: $${netDebt.toFixed(2)}).`
          );
        } else {
          console.warn(`⚠️ [Batch Billing] Falló el cobro automático para ${org.name}: ${result.message || 'Rechazado'}`);
        }
      } catch (chargeErr) {
        console.error(`❌ [Batch Billing] Error en transacción Payphone para ${org.name}:`, chargeErr.message);
      }
    }
  } catch (err) {
    console.error('❌ [Batch Billing] Error en job de facturación por lote:', err.message);
  }
};

/**
 * Tarea 2: Sistema Anti-Morosidad "Kill Switch" (48h antes del evento)
 * Revisa eventos que inician en las próximas 48 horas.
 * Si el organizador tiene deuda pendiente (> $0.00), intenta debitarla.
 * Si falla el cobro o no tiene saldo/token, desactiva `qr_scanning_enabled = false` para el evento.
 */
const runKillSwitchAuditJob = async () => {
  console.log('🛡️ [Kill Switch 48h] Auditando eventos próximos a iniciar...');
  try {
    // Buscar eventos activos con funciones dentro de las próximas 48 horas pertenecientes a Organizadores externos
    const upcomingEventsRes = await query(
      `SELECT DISTINCT e.id, e.title, e.organizer_id, e.qr_scanning_enabled, u.name as organizer_name, u.email as organizer_email, u.token_tarjeta, u.debt_balance, MIN(es.schedule_time) as next_show
       FROM events e
       JOIN event_schedules es ON es.event_id = e.id
       JOIN users u ON u.id = e.organizer_id
       WHERE e.status = 'active' 
         AND e.is_archived = FALSE
         AND e.organizer_id IS NOT NULL
         AND es.schedule_time >= NOW() 
         AND es.schedule_time <= NOW() + INTERVAL '48 hours'
       GROUP BY e.id, e.title, e.organizer_id, e.qr_scanning_enabled, u.name, u.email, u.token_tarjeta, u.debt_balance`
    );

    for (const ev of upcomingEventsRes.rows) {
      const debt = parseFloat(ev.debt_balance || 0);

      if (debt <= 0) {
        // Sin deuda, asegurar que escaneo esté habilitado
        if (!ev.qr_scanning_enabled) {
          await query('UPDATE events SET qr_scanning_enabled = TRUE WHERE id = $1', [ev.id]);
          console.log(`✅ [Kill Switch] Escaneo QR rehabilitado para evento "${ev.title}" (Sin deuda).`);
        }
        continue;
      }

      console.warn(`⚠️ [Kill Switch] Evento "${ev.title}" inicia en < 48h con deuda pendiente de $${debt.toFixed(2)} del organizador ${ev.organizer_name || 'N/A'}.`);

      let chargeSuccess = false;

      // Si tiene token de tarjeta, intentar cobro preventivo
      if (ev.token_tarjeta) {
        const grossCharge = calculateTotalWithGatewayFee(debt);
        const amountInCents = Math.round(grossCharge * 100);
        const clientTxId = `KILLSWITCH-${ev.id.slice(0, 8)}-${Date.now()}`;

        try {
          const result = await chargeWithCardToken({
            cardToken: ev.token_tarjeta,
            amountInCents,
            clientTxId,
            email: ev.organizer_email
          });

          if (result.success) {
            chargeSuccess = true;
            await query('UPDATE users SET debt_balance = debt_balance - $1 WHERE id = $2', [debt, ev.organizer_id]);
            await query('UPDATE events SET qr_scanning_enabled = TRUE WHERE id = $1', [ev.id]);
            console.log(`✅ [Kill Switch] Cobro de última hora liquidado para "${ev.title}". Puerta habilitada.`);
          }
        } catch (e) {
          console.error(`❌ [Kill Switch] Falló cobro preventivo para ${ev.title}:`, e.message);
        }
      }

      // Si no se pudo cobrar la deuda, activar KILL SWITCH (bloqueo de escáner en puerta)
      if (!chargeSuccess) {
        await query('UPDATE events SET qr_scanning_enabled = FALSE WHERE id = $1', [ev.id]);
        console.warn(`🚫 [Kill Switch ACTIVADO] Puerta BLOQUEADA para "${ev.title}". qr_scanning_enabled = FALSE`);

        sendPushToAdmins(
          '🚫 Kill Switch Activado',
          `Escáner bloqueado en puerta para "${ev.title}" debido a morosidad ($${debt.toFixed(2)} pendientes).`
        );
      }
    }
  } catch (err) {
    console.error('❌ [Kill Switch] Error en auditoría de morosidad:', err.message);
  }
};

/**
 * Inicia los cron jobs en background con intervalos regulares
 */
exports.startBillingCronService = () => {
  // Ejecutar primera verificación a los 10 segundos del arranque
  setTimeout(() => {
    runBatchBillingJob();
    runKillSwitchAuditJob();
  }, 10000);

  // Batch billing cada 30 minutos
  setInterval(runBatchBillingJob, 30 * 60 * 1000);

  // Kill Switch auditoría cada 15 minutos
  setInterval(runKillSwitchAuditJob, 15 * 60 * 1000);

  console.log('⏰ [Cron Service] Servicio de Batch Billing y Anti-Morosidad Kill Switch inicializado.');
};

exports.runBatchBillingJob = runBatchBillingJob;
exports.runKillSwitchAuditJob = runKillSwitchAuditJob;
exports.PLATFORM_FEE_PER_TICKET = PLATFORM_FEE_PER_TICKET;
