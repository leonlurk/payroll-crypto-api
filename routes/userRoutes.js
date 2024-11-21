const express = require('express');
const { registerUser, loginUser } = require('../controllers/userController');
const router = express.Router();

// Ruta para registrar un usuario
router.post('/register', registerUser);

// Ruta para iniciar sesión de un usuario
router.post('/login', loginUser);

module.exports = router;
