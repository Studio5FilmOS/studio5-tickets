const https = require('https');

/**
 * Confirma una transacción en la pasarela de pagos Payphone
 * @param {number|string} transactionId - ID de la transacción en Payphone
 * @param {string} clientTxId - ID único de la transacción generado por nuestro cliente
 * @returns {Promise<object>} - Respuesta de Payphone
 */
exports.verifyTransaction = (transactionId, clientTxId) => {
  return new Promise((resolve, reject) => {
    const env = process.env.PAYPHONE_ENV || 'sandbox';
    const host = 'pay.payphonetodoesposible.com';
    const path = '/api/button/V2/Confirm';
    const token = process.env.PAYPHONE_TOKEN;

    if (!token) {
      return reject(new Error('PAYPHONE_TOKEN no está configurado en las variables de entorno.'));
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
