const express = require('express');
const { generateWallet, transferFunds } = require('../controllers/walletController');
const auth = require('../middleware/auth');
const router = express.Router();
const { generatePaymentPage } = require('../controllers/walletController');
const { getPaymentData } = require('../controllers/walletController');

// Ruta para generar una billetera temporal - Protegida
router.post('/generate-wallet', auth, generateWallet);

// Ruta para transferir fondos - Protegida
router.post('/transfer-funds', auth, transferFunds);

// Nueva ruta para generar una URL temporal
router.post('/generate-payment-page', auth, generatePaymentPage);

// Nueva ruta para obtener los datos del pago
router.get('/payment-data/:uniqueId', getPaymentData);

module.exports = router;
