const { query } = require('../config/db');

/**
 * Guarda o actualiza la suscripción push de un usuario admin/staff.
 */
exports.subscribe = async (req, res) => {
  const { subscription } = req.body;
  const userId = req.user?.id;

  if (!subscription || !userId) {
    return res.status(400).json({ status: 'ERROR', message: 'Datos de suscripción inválidos.' });
  }

  try {
    await query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       ON CONFLICT (endpoint) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         p256dh = EXCLUDED.p256dh,
         auth = EXCLUDED.auth,
         is_active = TRUE,
         updated_at = NOW()`,
      [userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
    );
    console.log(`✅ Push suscripción guardada para usuario: ${userId}`);
    res.json({ status: 'OK', message: 'Suscripción activada.' });
  } catch (err) {
    console.error('Error guardando suscripción push:', err.message);
    res.status(500).json({ status: 'ERROR', message: 'Error al guardar suscripción.' });
  }
};

/**
 * Desactiva la suscripción push del usuario.
 */
exports.unsubscribe = async (req, res) => {
  const { endpoint } = req.body;
  try {
    await query(
      'UPDATE push_subscriptions SET is_active = FALSE WHERE endpoint = $1',
      [endpoint]
    );
    res.json({ status: 'OK', message: 'Suscripción desactivada.' });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: 'Error al desactivar suscripción.' });
  }
};

/**
 * Retorna la clave pública VAPID para que el frontend pueda suscribirse.
 */
exports.getVapidPublicKey = async (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
};

/**
 * Envía una notificación de prueba al admin actual.
 */
exports.sendTest = async (req, res) => {
  const { sendPushToAdmins } = require('../services/pushService');
  await sendPushToAdmins(
    '🎬 Studio 5 Notificaciones activas',
    'Las notificaciones push funcionan correctamente. Recibirás alertas de ventas y comprobantes.',
    { tag: 'test', url: '/admin' }
  );
  res.json({ status: 'OK', message: 'Notificación de prueba enviada.' });
};
