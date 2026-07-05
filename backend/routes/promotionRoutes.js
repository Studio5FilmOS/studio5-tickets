const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotionController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Ruta pública: obtener el banner activo para mostrar en la cartelera
router.get('/active', promotionController.getActivePromotion);

// Rutas privadas (solo Admin)
router.get('/', authMiddleware, roleMiddleware(['admin']), promotionController.getAllPromotions);
router.post('/', authMiddleware, roleMiddleware(['admin']), promotionController.createPromotion);
router.put('/:id', authMiddleware, roleMiddleware(['admin']), promotionController.updatePromotion);
router.patch('/:id/toggle', authMiddleware, roleMiddleware(['admin']), promotionController.togglePromotion);
router.delete('/:id', authMiddleware, roleMiddleware(['admin']), promotionController.deletePromotion);

module.exports = router;
