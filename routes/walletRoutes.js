const express = require('express');
const { generateWallet, transferFunds } = require('../controllers/walletController');
const auth = require('../middleware/auth');
const router = express.Router();

// Ruta para generar una billetera temporal - Protegida
router.post('/generate-wallet', auth, generateWallet);

// Ruta para transferir fondos - Protegida
router.post('/transfer-funds', auth, transferFunds);

module.exports = router;
