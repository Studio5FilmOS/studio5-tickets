const express = require('express');
const router = express.Router();
const pushController = require('../controllers/pushController');
const authMiddleware = require('../middleware/authMiddleware');

// Clave pública VAPID (pública, sin autenticación)
router.get('/vapid-public-key', pushController.getVapidPublicKey);

// Suscribirse / desuscribirse (requiere login)
router.post('/subscribe', authMiddleware, pushController.subscribe);
router.post('/unsubscribe', authMiddleware, pushController.unsubscribe);

// Notificación de prueba (solo admin)
router.post('/test', authMiddleware, pushController.sendTest);

module.exports = router;
