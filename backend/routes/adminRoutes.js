const express = require('express');
const router = express.Router();
const adminEmailController = require('../controllers/adminEmailController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Reenviar todos los correos pendientes (solo admin)
// GET  /api/admin/resend-emails?dry_run=true   → simulación sin enviar
// GET  /api/admin/resend-emails                → reenvío real
router.get('/resend-emails', authMiddleware, roleMiddleware(['admin']), adminEmailController.resendPendingEmails);

module.exports = router;
