const express = require('express');
const router = express.Router();
const logisticsController = require('../controllers/logisticsController');
// Aquí deberíamos agregar el middleware de autenticación que usas en el sistema, ej: const auth = require('../middleware/auth');
// De momento lo dejamos libre para que puedas probar la lógica.
// Para proteger las rutas luego, simplemente añadirías 'auth' como segundo parámetro: router.get('/', auth, logisticsController.getCampaigns);

// Rutas de Administración
router.get('/campaigns', logisticsController.getCampaigns);
router.post('/campaigns', logisticsController.createCampaign);

// Rutas de Operación (Scanner)
router.post('/dispatch', logisticsController.dispatchItems);
router.post('/receive', logisticsController.receiveItem);

// Ruta de Métricas (Dashboard / Animación)
router.get('/metrics/:campaign_id', logisticsController.getMetrics);

module.exports = router;
