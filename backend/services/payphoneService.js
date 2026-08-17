const https = require('https');

/**
 * Calcula el monto bruto que debe cobrarse para que, tras el descuento de comisión de Payphone,
 * el valor neto recibido cubra exactamente la deuda.
 * Comisión típica Payphone: ~5.5% + $0.22 IVA
 * Formula: Bruto = (Neto + 0.22) / (1 - 0.055)
 */
exports.calculateTotalWithGatewayFee = (netAmount) => {
  const net = parseFloat(netAmount) || 0;
  if (net <= 0) return 0;
  const commissionRate = 0.055;
  const fixedFee = 0.22;
  const gross = (net + fixedFee) / (1 - commissionRate);
  return Math.ceil(gross * 100) / 100; // Redondear a 2 decimales hacia arriba
};

/**
 * Confirma una transacción en la pasarela de pagos Payphone
 * @param {number|string} transactionId - ID de la transacción en Payphone
 * @param {string} clientTxId - ID único de la transacción generado por nuestro cliente
 * @returns {Promise<object>} - Respuesta de Payphone
 */
exports.verifyTransaction = (transactionId, clientTxId) => {
  return new Promise((resolve, reject) => {
    const host = 'pay.payphonetodoesposible.com';
    const path = '/api/button/V2/Confirm';
    const token = process.env.PAYPHONE_TOKEN;

    if (!token || token === 'tu_token_de_desarrollador_payphone') {
      console.log('⚡ [Payphone SIMULATION] Verificando TxId:', transactionId, 'clientTxId:', clientTxId);
      return resolve({ statusCode: 3, transactionStatus: 'Approved', simulated: true });
    }

    const payload = JSON.stringify({
      id: parseInt(transactionId) || 0,
      clientTxId: clientTxId
    });

    const options = {
      hostname: host,
      port: 443,
      path: path,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(parsed.message || `Error de Payphone: Código ${res.statusCode}`));
          }
        } catch (e) {
          reject(new Error(`Respuesta inválida de Payphone: ${data.slice(0, 100)}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(payload);
    req.end();
  });
};

/**
 * Realiza un cobro automático contra un token de tarjeta guardado (Batch Billing)
 * @param {object} params
 * @param {string} params.cardToken - Token de la tarjeta del organizador
 * @param {number} params.amountInCents - Monto total a cobrar en centavos (ej: $50.00 = 5000)
 * @param {string} params.clientTxId - Identificador único de transacción interna
 * @param {string} params.email - Email del organizador
 * @returns {Promise<object>}
 */
exports.chargeWithCardToken = ({ cardToken, amountInCents, clientTxId, email }) => {
  return new Promise((resolve, reject) => {
    const token = process.env.PAYPHONE_TOKEN;
    const host = 'pay.payphonetodoesposible.com';
    const path = '/api/v2/ChargeToken';

    // Si no hay token en desarrollo/test, simulamos cobro exitoso
    if (!token || token === 'tu_token_de_desarrollador_payphone') {
      console.log(`💳 [Payphone SIMULATION] Cobro por lote debitado a token: ${cardToken ? cardToken.slice(0, 6) : 'N/A'}... Monto: $${(amountInCents / 100).toFixed(2)} TxId: ${clientTxId}`);
      return resolve({
        success: true,
        transactionId: `SIM-TX-${Date.now()}`,
        status: 'Approved',
        amount: amountInCents,
        simulated: true
      });
    }

    const payload = JSON.stringify({
      cardToken,
      amount: amountInCents,
      clientTransactionId: clientTxId,
      email: email || 'cobros@studio5tickets.com',
      reference: 'Cobro de comisiones de plataforma por lote Studio 5 Tickets'
    });

    const options = {
      hostname: host,
      port: 443,
      path: path,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300 && (parsed.statusCode === 3 || parsed.transactionStatus === 'Approved' || parsed.status === 'Approved')) {
            resolve({ success: true, ...parsed });
          } else {
            resolve({ success: false, message: parsed.message || `Payphone rejected with code ${res.statusCode}`, raw: parsed });
          }
        } catch (e) {
          reject(new Error(`Respuesta inválida de Payphone al debitar token: ${data.slice(0, 100)}`));
        }
      });
    });

    req.on('error', err => reject(err));
    req.write(payload);
    req.end();
  });
};
