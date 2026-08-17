const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// 1. Ruta para Portal del Cliente (Cualquier usuario autenticado)
router.get('/my-tickets', authMiddleware, userController.getMyTickets);

// 2. Base de Datos / CRM de Clientes (Admin y Organizadores)
router.get('/customer-database', authMiddleware, roleMiddleware(['admin', 'organizer']), userController.getCustomerDatabase);

// 3. Rutas exclusivas para Dueños Generales (Admin)
router.get('/organizers-commission', authMiddleware, roleMiddleware(['admin']), userController.getOrganizersCommissionMetrics);
router.get('/', authMiddleware, roleMiddleware(['admin']), userController.getAllUsers);
router.post('/', authMiddleware, roleMiddleware(['admin']), userController.createUser);
router.put('/:id', authMiddleware, roleMiddleware(['admin']), userController.updateUser);
router.delete('/:id', authMiddleware, roleMiddleware(['admin']), userController.deleteUser);

module.exports = router;
