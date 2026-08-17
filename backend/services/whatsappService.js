const https = require('https');
const http = require('http');

/**
 * Despacha un webhook asíncrono hacia n8n para la entrega del ticket por WhatsApp (Whapi.Cloud)
 * Este proceso es completamente no-bloqueante (fire & forget) para proteger los recursos del servidor.
 * 
 * @param {object} payload
 * @param {string} payload.numero_whatsapp_cliente - Número internacional (+593...)
 * @param {string} payload.nombre_cliente - Nombre completo del comprador
 * @param {string} payload.nombre_evento - Título del evento
 * @param {string} payload.url_del_ticket_pdf_o_qr - URL pública del boleto
 * @param {string} [payload.orden_numero] - Código de la orden
 * @param {number} [payload.total] - Total pagado
 * @param {string} [payload.localidad] - Nombre de la localidad o desglose
 */
exports.sendWhatsAppTicketWebhook = (payload) => {
  const webhookUrl = process.env.N8N_WHATSAPP_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log('📱 [WhatsApp Webhook] N8N_WHATSAPP_WEBHOOK_URL no configurado. Simulación de envío:', {
      numero: payload.numero_whatsapp_cliente,
      cliente: payload.nombre_cliente,
      evento: payload.nombre_evento,
      ticketUrl: payload.url_del_ticket_pdf_o_qr
    });
    return Promise.resolve({ simulated: true });
  }

  return new Promise((resolve) => {
    try {
      const urlObj = new URL(webhookUrl);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;

      const body = JSON.stringify({
        numero_whatsapp_cliente: payload.numero_whatsapp_cliente,
        nombre_cliente: payload.nombre_cliente,
        nombre_evento: payload.nombre_evento,
        url_del_ticket_pdf_o_qr: payload.url_del_ticket_pdf_o_qr,
        orden_numero: payload.orden_numero,
        total: payload.total,
        localidad: payload.localidad || 'General',
        timestamp: new Date().toISOString()
      });

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'User-Agent': 'Studio5-Tickets-V2-Webhook'
        },
        timeout: 5000 // 5s timeout
      };

      const req = client.request(options, (res) => {
        let respData = '';
        res.on('data', chunk => { respData += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`✅ [WhatsApp Webhook] Notificación enviada con éxito a n8n para ${payload.numero_whatsapp_cliente}`);
            resolve({ success: true, status: res.statusCode });
          } else {
            console.warn(`⚠️ [WhatsApp Webhook] n8n respondió con código ${res.statusCode}: ${respData}`);
            resolve({ success: false, status: res.statusCode });
          }
        });
      });

      req.on('error', (err) => {
        console.error('❌ [WhatsApp Webhook] Error enviando webhook a n8n:', err.message);
        resolve({ success: false, error: err.message });
      });

      req.on('timeout', () => {
        req.destroy();
        console.warn('⚠️ [WhatsApp Webhook] Timeout al conectar con n8n');
        resolve({ success: false, error: 'timeout' });
      });

      req.write(body);
      req.end();
    } catch (err) {
      console.error('❌ [WhatsApp Webhook] Error al construir petición:', err.message);
      resolve({ success: false, error: err.message });
    }
  });
};
