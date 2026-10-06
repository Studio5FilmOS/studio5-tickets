const express = require('express');
const router = express.Router();
const logisticsController = require('../controllers/logisticsController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Rutas de Campañas (Admin y Organizador)
router.get('/campaigns', authMiddleware, roleMiddleware(['admin', 'organizer']), logisticsController.getCampaigns);
router.post('/campaigns', authMiddleware, roleMiddleware(['admin', 'organizer']), logisticsController.createCampaign);
router.get('/campaigns/:id', authMiddleware, roleMiddleware(['admin', 'organizer', 'staff']), logisticsController.getCampaignById);
router.delete('/campaigns/:id', authMiddleware, roleMiddleware(['admin', 'organizer']), logisticsController.deleteCampaign);

// Items para impresión de stickers / exportación
router.get('/campaigns/:campaign_id/items', authMiddleware, roleMiddleware(['admin', 'organizer', 'staff']), logisticsController.getCampaignItems);

// Asignación de Staff a campañas
router.post('/campaigns/:campaign_id/assign-staff', authMiddleware, roleMiddleware(['admin', 'organizer']), logisticsController.assignStaff);

// Campañas disponibles para el Staff logueado
router.get('/staff/campaigns', authMiddleware, roleMiddleware(['admin', 'organizer', 'staff']), logisticsController.getStaffCampaigns);

// Rutas de Operación (Escáner y Registro)
router.post('/dispatch', authMiddleware, roleMiddleware(['admin', 'organizer', 'staff']), logisticsController.dispatchItems);
router.post('/receive', authMiddleware, roleMiddleware(['admin', 'organizer', 'staff']), logisticsController.receiveItem);

// Ruta de Métricas (Dashboard / Pantalla)
router.get('/metrics/:campaign_id', logisticsController.getMetrics);

module.exports = router;
