const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// ==========================================
// RUTAS DE BOLETO ELECTRÓNICO Y SCANNER
// ==========================================

// Ver detalle de ticket individual por código (Vista Pública)
router.get('/:code', ticketController.getTicketByCode);

// Escaneo / Validación de QR único por compra (Staff, Admin, Organizador)
router.post('/scan', authMiddleware, roleMiddleware(['admin', 'staff', 'organizer']), ticketController.validateTicket);

// Check-in interactivo parcial de boletos (Staff, Admin, Organizador)
router.post('/check-in', authMiddleware, roleMiddleware(['admin', 'staff', 'organizer']), ticketController.checkInTickets);

// ==========================================
// RUTAS DE INTERACTIVIDAD EN VIVO (MOMENTO WOW)
// ==========================================

// Espectador con Boleto Oficial
router.get('/interaction/active/:eventId/:scheduleId/:ticketId', ticketController.getLiveInteraction);
router.post('/interaction/vote', ticketController.submitVote);

// NUEVO: Espectador Anónimo (QR General de Sala)
router.get('/interaction/public/:scheduleId/:voterId', ticketController.getPublicLiveInteraction);
router.post('/interaction/public/vote', ticketController.submitPublicVote);

// Administración de Interactividad (Staff, Admin, Organizador)
router.get('/interaction/admin/hub/:eventId/:scheduleId', authMiddleware, roleMiddleware(['admin', 'staff', 'organizer']), ticketController.getAdminInteractions);
router.post('/interaction/admin/poll', authMiddleware, roleMiddleware(['admin', 'staff', 'organizer']), ticketController.createPoll);
router.delete('/interaction/admin/poll/:id', authMiddleware, roleMiddleware(['admin', 'staff', 'organizer']), ticketController.deletePoll);
router.post('/interaction/admin/poll/toggle', authMiddleware, roleMiddleware(['admin', 'staff', 'organizer']), ticketController.togglePollStatus);
router.post('/interaction/admin/clue', authMiddleware, roleMiddleware(['admin', 'staff', 'organizer']), ticketController.createClue);
router.delete('/interaction/admin/clue/:id', authMiddleware, roleMiddleware(['admin', 'staff', 'organizer']), ticketController.deleteClue);
router.post('/interaction/admin/clue/reveal', authMiddleware, roleMiddleware(['admin', 'staff', 'organizer']), ticketController.revealClue);

// Momento WOW anterior (Standby)
router.post('/send-pista', authMiddleware, roleMiddleware(['admin', 'staff', 'organizer']), ticketController.sendMassPista);

module.exports = router;
