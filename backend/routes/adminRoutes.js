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

// Gestión WhatsApp Meta Cloud API (Admin y Organizadores)
router.get('/whatsapp', authMiddleware, roleMiddleware(['admin', 'organizer']), settingsController.getWhatsAppConfig);
router.put('/whatsapp', authMiddleware, roleMiddleware(['admin', 'organizer']), settingsController.updateWhatsAppConfig);
router.get('/whatsapp/templates', authMiddleware, roleMiddleware(['admin', 'organizer']), settingsController.getLiveTemplates);
router.post('/whatsapp/test-send', authMiddleware, roleMiddleware(['admin', 'organizer']), settingsController.testWhatsAppSend);

// Reenviar todos los correos pendientes (solo admin)
router.get('/resend-emails', authMiddleware, roleMiddleware(['admin']), adminEmailController.resendPendingEmails);

module.exports = router;
