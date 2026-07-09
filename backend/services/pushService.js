const webpush = require('web-push');
const { query } = require('../config/db');

// Configurar VAPID
webpush.setVapidDetails(
  'mailto:admin@studio5film.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/**
 * Envía una notificación push a todos los administradores suscritos.
 * @param {string} title - Título de la notificación
 * @param {string} body - Cuerpo del mensaje
 * @param {object} data - Datos adicionales (url, tag, etc.)
 */
const sendPushToAdmins = async (title, body, data = {}) => {
  try {
    const result = await query(
      `SELECT ps.endpoint, ps.p256dh, ps.auth 
       FROM push_subscriptions ps
       JOIN users u ON u.id = ps.user_id
       WHERE u.role IN ('admin', 'staff') AND ps.is_active = TRUE`
    );

    if (result.rows.length === 0) {
      console.log('📵 No hay administradores suscritos a push notifications.');
      return;
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: data.tag || 'studio5-admin',
      url: data.url || '/admin',
      ...data
    });

    const sendPromises = result.rows.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
      } catch (err) {
        // Si la suscripción expiró o fue revocada, la desactivamos
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`🔕 Suscripción expirada: ${sub.endpoint.slice(0, 40)}...`);
          await query(
            'UPDATE push_subscriptions SET is_active = FALSE WHERE endpoint = $1',
            [sub.endpoint]
          );
        } else {
          console.error('❌ Error enviando push notification:', err.message);
        }
      }
    });

    await Promise.allSettled(sendPromises);
    console.log(`✅ Push enviada a ${result.rows.length} admin(s): "${title}"`);
  } catch (err) {
    console.error('❌ Error en sendPushToAdmins:', err.message);
  }
};

module.exports = { sendPushToAdmins };
