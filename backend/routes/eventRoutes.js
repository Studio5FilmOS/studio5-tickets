const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const authMiddleware = require('../middleware/authMiddleware');
const optionalAuthMiddleware = require('../middleware/optionalAuthMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Rutas Públicas (con auth opcional para filtrar si es organizer/staff/admin)
router.get('/', optionalAuthMiddleware, eventController.getAllEvents);
router.get('/:id', optionalAuthMiddleware, eventController.getEventById);

// Rutas Privadas (Admin & Organizer)
router.post('/', authMiddleware, roleMiddleware(['admin', 'organizer']), eventController.createEvent);
router.put('/:id', authMiddleware, roleMiddleware(['admin', 'organizer']), eventController.updateEvent);
router.patch('/:id/theme', authMiddleware, roleMiddleware(['admin', 'organizer']), eventController.updateEventTheme);
router.patch('/:id/status', authMiddleware, roleMiddleware(['admin', 'organizer']), eventController.toggleEventStatus);
router.delete('/:id', authMiddleware, roleMiddleware(['admin', 'organizer']), eventController.deleteEvent);
router.delete('/:id/force', authMiddleware, roleMiddleware(['admin']), eventController.forceDeleteEvent);
router.post('/upload', authMiddleware, roleMiddleware(['admin', 'organizer']), eventController.uploadImage);
router.post('/parse-seating-layout', authMiddleware, roleMiddleware(['admin', 'organizer']), eventController.parseSeatingLayout);

module.exports = router;
