const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/authMiddleware');
const optionalAuthMiddleware = require('../middleware/optionalAuthMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Crear Orden (Público - Comprador o POS Admin/Staff)
router.post('/', optionalAuthMiddleware, orderController.createOrder);

// Obtener detalle de orden por ID UUID (Admin/Staff)
router.get('/:id', optionalAuthMiddleware, orderController.getOrderById);

// Obtener detalle de orden por order_num (Público)
router.get('/numero/:orderNum', optionalAuthMiddleware, orderController.getOrderByNum);

// Listar todas las órdenes (Staff/Admin/Organizador)
router.get('/', authMiddleware, roleMiddleware(['admin', 'staff', 'organizer']), orderController.getAllOrders);

// Actualizar estado de orden (Admin y Organizador para sus propios eventos)
router.patch('/:id/status', authMiddleware, roleMiddleware(['admin', 'organizer']), orderController.updateOrderStatus);
// Editar detalles de orden (Admin/Staff/Organizador)
router.patch('/:id', authMiddleware, roleMiddleware(['admin', 'staff', 'organizer']), orderController.updateOrder);

// Subir comprobante a orden existente (Admin/Staff/Organizador)
router.post('/:id/receipt', authMiddleware, roleMiddleware(['admin', 'staff', 'organizer']), orderController.uploadReceipt);

module.exports = router;
