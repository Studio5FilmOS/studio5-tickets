const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const authMiddleware = require('../middleware/authMiddleware');
const optionalAuthMiddleware = require('../middleware/optionalAuthMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Rutas Públicas (con auth opcional para calcular aforo completo si es staff/admin)
router.get('/', optionalAuthMiddleware, eventController.getAllEvents);
router.get('/:id', optionalAuthMiddleware, eventController.getEventById);

// Rutas Privadas (Admin)
router.post('/', authMiddleware, roleMiddleware(['admin']), eventController.createEvent);
router.put('/:id', authMiddleware, roleMiddleware(['admin']), eventController.updateEvent);
router.patch('/:id/status', authMiddleware, roleMiddleware(['admin']), eventController.toggleEventStatus);

module.exports = router;
