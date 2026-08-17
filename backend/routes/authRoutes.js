const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Rutas Públicas
router.post('/register', authController.register);
router.post('/verify-otp', authController.verifyOtp);
router.post('/resend-otp', authController.resendOtp);
router.post('/login', authController.login);

// Rutas Protegidas
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
