const express = require('express');
const router = express.Router();
const adminEmailController = require('../controllers/adminEmailController');
const settingsController = require('../controllers/settingsController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Configuración de la plataforma (pública)
router.get('/settings/public', settingsController.getPublicSettings);

// Configuración de la plataforma (privada)
router.get('/settings', authMiddleware, roleMiddleware(['admin', 'organizer']), settingsController.getSettings);
router.put('/settings', authMiddleware, roleMiddleware(['admin']), settingsController.updateSettings);

// Reenviar todos los correos pendientes (solo admin)
// GET  /api/admin/resend-emails?dry_run=true   → simulación sin enviar
// GET  /api/admin/resend-emails                → reenvío real
router.get('/resend-emails', authMiddleware, roleMiddleware(['admin']), adminEmailController.resendPendingEmails);

module.exports = router;

