const express = require('express');
const { registerUser, loginUser, updateMainWallet, getUserDetails} = require('../controllers/userController');
const protect = require('../middleware/auth');
const router = express.Router();


// Ruta para registrar un usuario
router.post('/register', registerUser);

// Ruta para iniciar sesión de un usuario
router.post('/login', loginUser);

// Ruta para actualizar la billetera principal
router.put('/update-main-wallet/:userId', protect, updateMainWallet);

router.get('/me', protect, getUserDetails);


module.exports = router;
