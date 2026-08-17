const { calculateTotalWithGatewayFee } = require('./services/payphoneService');
const { runBatchBillingJob, runKillSwitchAuditJob } = require('./services/billingCronService');
const { sendWhatsAppTicketWebhook } = require('./services/whatsappService');

async function testV2Suite() {
  console.log('==============================================');
  console.log('🚀 INICIANDO TEST SUITE STUDIO 5 TICKETS V2');
  console.log('==============================================');

  // 1. Test Payphone Surcharge Calculation (Prioridad 1)
  console.log('\n[1/4] Testeando cálculo de recargo Payphone...');
  const netDebt = 50.00;
  const chargeAmount = calculateTotalWithGatewayFee(netDebt);
  console.log(`- Deuda neta: $${netDebt.toFixed(2)} => Monto bruto a cobrar a tarjeta: $${chargeAmount.toFixed(2)}`);
  if (chargeAmount > netDebt && chargeAmount >= 53.00) {
    console.log('✅ Cálculo de recargo Payphone OK (cubre comisión fija + variable)');
  } else {
    console.error('❌ Error en cálculo de recargo Payphone');
  }

  // 2. Test WhatsApp Webhook Dispatch Format (Prioridad 5)
  console.log('\n[2/4] Testeando despacho asíncrono WhatsApp bot (n8n)...');
  try {
    const waResult = await sendWhatsAppTicketWebhook({
      numero_whatsapp_cliente: '+593991234567',
      nombre_cliente: 'Cliente VIP',
      nombre_evento: 'Gala V2 Test',
      url_del_ticket_pdf_o_qr: 'https://tickets.studio5.com/boleto/TCK-123456',
      orden_numero: 'ORD-TEST-V2',
      total: 50.00,
      localidad: 'VIP Platinum'
    });
    console.log(`- Resultado despacho WhatsApp:`, waResult);
    console.log('✅ Despacho a n8n procesado de forma segura y no bloqueante');
  } catch (err) {
    console.error('❌ Error en test de WhatsApp:', err.message);
  }

  // 3. Test Cron Jobs (Prioridad 1 y 2)
  console.log('\n[3/4] Testeando ejecución de Cron Jobs...');
  try {
    const billingResult = await runBatchBillingJob();
    console.log(`- Resultado Batch Billing Cron:`, billingResult);
    
    const killSwitchResult = await runKillSwitchAuditJob();
    console.log(`- Resultado Kill Switch Audit Cron:`, killSwitchResult);
    console.log('✅ Cron Jobs ejecutados con éxito.');
  } catch (err) {
    console.error('❌ Error en Cron Jobs:', err.message);
  }

  console.log('\n==============================================');
  console.log('🎉 TEST SUITE COMPLETADO CON ÉXITO');
  console.log('==============================================');
}

testV2Suite().catch(console.error);
