const express = require('express');
const { 
    generateWallet, 
    transferFunds, 
    checkBalance, 
    transactionHistory,
    confirmDeposit,
    checkTransactionStatus 
} = require('../controllers/walletController');
const auth = require('../middleware/auth');
const { 
    validateTransferFunds, 
    validateConfirmDeposit, 
    handleValidationErrors 
} = require('../middleware/validation');
const router = express.Router();

// Ruta para generar una billetera temporal - Protegida
router.post('/generate-wallet', auth, generateWallet);

// Ruta para transferir fondos - Protegida
router.post('/transfer-funds', 
    auth, 
    validateTransferFunds,
    handleValidationErrors,
    transferFunds
);

// Ruta para verificar el saldo de las billeteras - Protegida
router.get('/check-balance', auth, checkBalance);

// Ruta para obtener historial de transacciones - Protegida
router.get('/transaction-history', auth, transactionHistory);

// Ruta para confirmar depósito (webhook) - Protegida
router.post('/confirm-deposit',
    auth,
    validateConfirmDeposit,
    handleValidationErrors,
    confirmDeposit
);

// Ruta para verificar el estado de transacciones - Protegida
router.get('/transaction-status', auth, checkTransactionStatus);

module.exports = router;
