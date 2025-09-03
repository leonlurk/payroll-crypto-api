const { body, param, query, validationResult } = require('express-validator');

// Validaciones para usuarios
exports.validateRegister = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email inválido'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('La contraseña debe tener al menos 8 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('La contraseña debe contener mayúsculas, minúsculas, números y caracteres especiales')
];

exports.validateLogin = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email inválido'),
    body('password')
        .notEmpty()
        .withMessage('Contraseña requerida')
];

// Validaciones para wallets
exports.validateTransferFunds = [
    body('walletId')
        .isUUID()
        .withMessage('ID de billetera inválido')
];

exports.validateConfirmDeposit = [
    body('walletAddress')
        .notEmpty()
        .withMessage('Dirección de wallet requerida'),
    body('amount')
        .isNumeric()
        .isFloat({ min: 0.0001 })
        .withMessage('Monto inválido'),
    body('txHash')
        .notEmpty()
        .withMessage('Hash de transacción requerido'),
    body('network')
        .isIn(['TRON', 'BSC'])
        .withMessage('Red no soportada')
];

// Middleware para manejar errores de validación
exports.handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false,
            errors: errors.array() 
        });
    }
    next();
};