const express = require('express');
const { 
    registerUser, 
    loginUser, 
    authenticateWithToken, 
    verifyEmail, 
    resendVerificationEmail 
} = require('../controllers/userController');
const { validateRegister, validateLogin, handleValidationErrors } = require('../middleware/validation');
const router = express.Router();

// Ruta para registrar un usuario
router.post('/register', 
    validateRegister, 
    handleValidationErrors, 
    registerUser
);

// Ruta para iniciar sesión de un usuario
router.post('/login', 
    validateLogin, 
    handleValidationErrors, 
    loginUser
);

// Ruta para autenticar con token de Supabase
router.post('/auth-token', authenticateWithToken);

// Ruta para verificar email con token
router.post('/verify-email', verifyEmail);

// Ruta para reenviar email de verificación
router.post('/resend-verification', resendVerificationEmail);

module.exports = router;
