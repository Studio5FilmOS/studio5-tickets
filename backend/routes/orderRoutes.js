const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/authMiddleware');
const optionalAuthMiddleware = require('../middleware/optionalAuthMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Crear Orden (Público - Comprador o POS Admin/Staff)
router.post('/', optionalAuthMiddleware, orderController.createOrder);

// Obtener detalle de orden
router.get('/:id', optionalAuthMiddleware, orderController.getOrderById);

// Listar todas las órdenes (Staff/Admin)
router.get('/', authMiddleware, roleMiddleware(['admin', 'staff']), orderController.getAllOrders);

// Actualizar estado de orden (Admin - Aprobar/Anular)
router.patch('/:id/status', authMiddleware, roleMiddleware(['admin']), orderController.updateOrderStatus);
// Editar detalles de orden (Admin/Staff)
router.patch('/:id', authMiddleware, roleMiddleware(['admin', 'staff']), orderController.updateOrder);

// Subir comprobante a orden existente (Admin/Staff)
router.post('/:id/receipt', authMiddleware, roleMiddleware(['admin', 'staff']), orderController.uploadReceipt);

module.exports = router;
