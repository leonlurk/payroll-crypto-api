const emailService = require('../services/emailService');
const logger = require('../utils/logger');

// Enviar email de bienvenida
exports.sendWelcomeEmail = async (req, res) => {
    try {
        const { email, userName } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email es requerido'
            });
        }

        const result = await emailService.sendWelcomeEmail(email, userName);
        
        res.json(result);
    } catch (error) {
        logger.error('Error en endpoint de welcome email:', error);
        res.status(500).json({
            success: false,
            message: 'Error enviando email de bienvenida'
        });
    }
};

// Enviar email de verificación con link
exports.sendVerificationEmail = async (req, res) => {
    try {
        const { email, userName, verificationUrl, verificationToken } = req.body;

        // Validación de datos requeridos
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email es requerido'
            });
        }

        if (!verificationUrl || !verificationToken) {
            return res.status(400).json({
                success: false,
                message: 'URL de verificación y token son requeridos'
            });
        }

        // Log para debugging (sin loggear el token completo en producción)
        const logMessage = process.env.NODE_ENV === 'production' 
            ? `Enviando email de verificación a: ${email}`
            : `Enviando email de verificación a: ${email}, Token: ${verificationToken.substring(0, 8)}...`;
        logger.info(logMessage);

        // Enviar email
        const result = await emailService.sendVerificationEmail(email, userName, verificationUrl, verificationToken);
        
        // Manejar respuesta
        if (result.success) {
            logger.info(`Email de verificación enviado exitosamente a: ${email}`);
            res.json({ 
                success: true, 
                message: 'Email de verificación enviado',
                messageId: result.messageId
            });
        } else {
            logger.warn(`Error al enviar email de verificación a: ${email}`, result.error);
            res.status(400).json({
                success: false,
                message: 'Error al enviar email de verificación',
                error: result.error
            });
        }
    } catch (error) {
        logger.error('Error en endpoint de verification email:', error);
        res.status(500).json({
            success: false,
            message: 'Error enviando email de verificación'
        });
    }
};

// Enviar email de recuperación de contraseña
exports.sendPasswordResetEmail = async (req, res) => {
    try {
        const { email, resetCode } = req.body;

        // Validación de entrada
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email es requerido'
            });
        }

        if (!resetCode) {
            return res.status(400).json({
                success: false,
                message: 'Código de reset es requerido'
            });
        }

        // Log para debugging (sin loggear el código en producción)
        const logMessage = process.env.NODE_ENV === 'production' 
            ? `Enviando email de reset a: ${email}`
            : `Enviando email de reset a: ${email} con código: ${resetCode}`;
        logger.info(logMessage);

        // Enviar email
        const result = await emailService.sendPasswordResetEmail(email, resetCode);
        
        // Manejar respuesta del servicio
        if (result.success) {
            logger.info(`Email de reset enviado exitosamente a: ${email}`);
            res.json({ 
                success: true, 
                message: 'Email enviado' 
            });
        } else {
            logger.warn(`Error al enviar email de reset a: ${email}`, result.error);
            res.status(400).json({
                success: false,
                message: 'Error al enviar email'
            });
        }
    } catch (error) {
        logger.error('Error en endpoint de password reset email:', error);
        res.status(500).json({
            success: false,
            message: 'Error al enviar email'
        });
    }
};

// Enviar notificación de transacción
exports.sendTransactionNotification = async (req, res) => {
    try {
        const { email, transactionDetails } = req.body;

        if (!email || !transactionDetails) {
            return res.status(400).json({
                success: false,
                message: 'Email y detalles de transacción son requeridos'
            });
        }

        const result = await emailService.sendTransactionNotification(email, transactionDetails);
        
        res.json(result);
    } catch (error) {
        logger.error('Error en endpoint de transaction notification:', error);
        res.status(500).json({
            success: false,
            message: 'Error enviando notificación de transacción'
        });
    }
};

// Enviar email de confirmación de pago
exports.sendPaymentConfirmation = async (req, res) => {
    try {
        const { email, paymentDetails } = req.body;

        if (!email || !paymentDetails) {
            return res.status(400).json({
                success: false,
                message: 'Email y detalles de pago son requeridos'
            });
        }

        const result = await emailService.sendPaymentConfirmation(email, paymentDetails);
        
        res.json(result);
    } catch (error) {
        logger.error('Error en endpoint de payment confirmation:', error);
        res.status(500).json({
            success: false,
            message: 'Error enviando confirmación de pago'
        });
    }
};

// Enviar email de actividad sospechosa
exports.sendSecurityAlert = async (req, res) => {
    try {
        const { email, alertDetails } = req.body;

        if (!email || !alertDetails) {
            return res.status(400).json({
                success: false,
                message: 'Email y detalles de alerta son requeridos'
            });
        }

        const result = await emailService.sendSecurityAlert(email, alertDetails);
        
        res.json(result);
    } catch (error) {
        logger.error('Error en endpoint de security alert:', error);
        res.status(500).json({
            success: false,
            message: 'Error enviando alerta de seguridad'
        });
    }
};

// Enviar email de cuenta MT5 creada
exports.sendMT5AccountCreatedEmail = async (req, res) => {
    try {
        const { to, accountData, credentials } = req.body;

        // Validación de datos requeridos
        if (!to || !to.email) {
            return res.status(400).json({
                success: false,
                message: 'Email del destinatario es requerido'
            });
        }

        if (!accountData) {
            return res.status(400).json({
                success: false,
                message: 'Datos de la cuenta son requeridos'
            });
        }

        if (!credentials || !credentials.login || !credentials.password || !credentials.investorPassword) {
            return res.status(400).json({
                success: false,
                message: 'Credenciales completas son requeridas'
            });
        }

        // Validar y normalizar tipo de cuenta
        const normalizedAccountType = accountData.accountType?.toUpperCase();
        if (!['DEMO', 'REAL'].includes(normalizedAccountType)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo de cuenta debe ser DEMO o REAL'
            });
        }
        // Normalizar el tipo de cuenta para el resto del proceso
        accountData.accountType = normalizedAccountType;

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(to.email)) {
            return res.status(400).json({
                success: false,
                message: 'Formato de email inválido'
            });
        }

        // Log para auditoría (sin loggear contraseñas en producción)
        const logMessage = process.env.NODE_ENV === 'production' 
            ? `Enviando email de cuenta MT5 ${accountData.accountType} a: ${to.email}, Cuenta: ${accountData.accountNumber}`
            : `Enviando email de cuenta MT5 ${accountData.accountType} a: ${to.email}, Cuenta: ${accountData.accountNumber}, Login: ${credentials.login}`;
        logger.info(logMessage);

        // Enviar email
        const result = await emailService.sendMT5AccountCreatedEmail(to, accountData, credentials);
        
        // Manejar respuesta
        if (result.success) {
            logger.info(`Email de cuenta MT5 enviado exitosamente a: ${to.email}, MessageId: ${result.messageId}`);
            res.json({
                success: true,
                message: 'Email enviado correctamente',
                messageId: result.messageId
            });
        } else {
            logger.warn(`Error al enviar email de cuenta MT5 a: ${to.email}`, result.error);
            res.status(400).json({
                success: false,
                message: 'Error al enviar email'
            });
        }
    } catch (error) {
        logger.error('Error en endpoint de MT5 account created email:', error);
        res.status(500).json({
            success: false,
            message: 'Error al enviar email'
        });
    }
};