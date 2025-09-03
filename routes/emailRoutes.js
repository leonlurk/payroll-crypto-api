const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');
const authMiddleware = require('../middleware/auth');

// Todos los endpoints de email requieren autenticación
// excepto los que son llamados internamente por el sistema

// Email de bienvenida (llamado internamente por registro)
router.post('/welcome', emailController.sendWelcomeEmail);

// Email de verificación
router.post('/verification', emailController.sendVerificationEmail);

// Email de recuperación de contraseña
router.post('/password-reset', emailController.sendPasswordResetEmail);

// Notificación de transacción (requiere autenticación)
router.post('/transaction', authMiddleware, emailController.sendTransactionNotification);

// Confirmación de pago (requiere autenticación)
router.post('/payment-confirmation', authMiddleware, emailController.sendPaymentConfirmation);

// Alerta de seguridad (puede ser llamado sin autenticación para alertas críticas)
router.post('/security-alert', emailController.sendSecurityAlert);

// Email de cuenta MT5 creada
router.post('/mt5-account-created', emailController.sendMT5AccountCreatedEmail);

module.exports = router;