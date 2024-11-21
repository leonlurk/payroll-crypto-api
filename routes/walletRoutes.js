const express = require('express');
const { generateWallet, transferFunds, checkBalance, transactionHistory } = require('../controllers/walletController');
const auth = require('../middleware/auth');
const router = express.Router();

// Ruta para generar una billetera temporal - Protegida
router.post('/generate-wallet', auth, generateWallet);

// Ruta para transferir fondos - Protegida
router.post('/transfer-funds', auth, transferFunds);

// Ruta para verificar el saldo de las billeteras - Protegida
router.get('/check-balance', auth, checkBalance);

router.get('/transaction-history', auth, transactionHistory);

module.exports = router;
