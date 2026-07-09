const express = require('express');
const router = express.Router();
const pushController = require('../controllers/pushController');
const { verifyToken } = require('../middleware/auth');

// Clave pública VAPID (pública, sin autenticación)
router.get('/vapid-public-key', pushController.getVapidPublicKey);

// Suscribirse / desuscribirse (requiere login)
router.post('/subscribe', verifyToken, pushController.subscribe);
router.post('/unsubscribe', verifyToken, pushController.unsubscribe);

// Notificación de prueba (solo admin)
router.post('/test', verifyToken, pushController.sendTest);

module.exports = router;
