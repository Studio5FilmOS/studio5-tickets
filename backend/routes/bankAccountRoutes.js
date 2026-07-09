const express = require('express');
const router = express.Router();
const bankAccountController = require('../controllers/bankAccountController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Rutas públicas
router.get('/', bankAccountController.getBankAccountsPublic);

// Rutas de administración (requieren rol de admin)
router.get('/admin', authMiddleware, roleMiddleware(['admin']), bankAccountController.getBankAccountsAdmin);
router.post('/admin', authMiddleware, roleMiddleware(['admin']), bankAccountController.createBankAccount);
router.put('/admin/:id', authMiddleware, roleMiddleware(['admin']), bankAccountController.updateBankAccount);
router.delete('/admin/:id', authMiddleware, roleMiddleware(['admin']), bankAccountController.deleteBankAccount);

module.exports = router;
