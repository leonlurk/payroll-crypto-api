const jwt = require('jsonwebtoken');
const { UserModel } = require('../models/supabaseModel');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');
const emailService = require('../services/emailService');

// Función para registrar un nuevo usuario
exports.registerUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Validación de entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false,
                errors: errors.array() 
            });
        }

        logger.info(`Registration attempt for email: ${email}`);

        // Verificar si el usuario ya existe
        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
            logger.warn(`Registration failed - user already exists: ${email}`);
            return res.status(400).json({ 
                success: false,
                msg: 'El usuario ya está registrado' 
            });
        }

        // Crear un nuevo usuario en Supabase Auth
        const user = await UserModel.create({ email, password });

        if (!user) {
            throw new Error('Failed to create user');
        }

        // Generar un token JWT para la API
        const payload = { 
            userId: user.id,
            email: user.email 
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

        logger.info(`User registered successfully: ${email}`);

        // Enviar email de bienvenida
        try {
            await emailService.sendWelcomeEmail(email, email.split('@')[0]);
            logger.info(`Welcome email sent to ${email}`);
        } catch (emailError) {
            logger.warn(`Failed to send welcome email to ${email}:`, emailError);
            // No fallar el registro si el email no se envía
        }

        res.json({ 
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email
            }
        });
    } catch (error) {
        logger.error('Error registering user:', error);
        res.status(500).json({ 
            success: false,
            msg: 'Error en el servidor durante el registro' 
        });
    }
};

// Función para iniciar sesión
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Validación de entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false,
                errors: errors.array() 
            });
        }

        logger.info(`Login attempt for email: ${email}`);

        // Verificar credenciales con Supabase Auth
        const user = await UserModel.verifyPassword(email, password);
        
        if (!user) {
            logger.warn(`Login failed - invalid credentials: ${email}`);
            return res.status(400).json({ 
                success: false,
                msg: 'Credenciales inválidas' 
            });
        }

        // Generar un token JWT para la API
        const payload = { 
            userId: user.id,
            email: user.email 
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

        logger.info(`User logged in successfully: ${email}`);

        res.json({ 
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email
            }
        });
    } catch (error) {
        logger.error('Error during login:', error);
        res.status(500).json({ 
            success: false,
            msg: 'Error en el servidor durante el login' 
        });
    }
};

// Función para autenticar con token de Supabase
exports.authenticateWithToken = async (req, res) => {
    const { token, email } = req.body;

    try {
        // Validación de entrada
        if (!token || !email) {
            return res.status(400).json({ 
                success: false,
                msg: 'Token y email son requeridos' 
            });
        }

        logger.info(`Token authentication attempt for email: ${email}`);

        // Verificar el token con Supabase
        const user = await UserModel.verifySupabaseToken(token);
        
        if (!user || user.email !== email) {
            logger.warn(`Token authentication failed: ${email}`);
            return res.status(400).json({ 
                success: false,
                msg: 'Token inválido o no coincide con el email' 
            });
        }

        // Generar un token JWT para la API
        const payload = { 
            userId: user.id,
            email: user.email 
        };
        const apiToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

        logger.info(`User authenticated with token successfully: ${email}`);

        res.json({ 
            success: true,
            token: apiToken,
            user: {
                id: user.id,
                email: user.email
            }
        });
    } catch (error) {
        logger.error('Token authentication error:', error);
        res.status(500).json({ 
            success: false,
            msg: 'Error en el servidor durante la autenticación' 
        });
    }
};

// Función para verificar email con token
exports.verifyEmail = async (req, res) => {
    const { token } = req.body;

    try {
        if (!token) {
            return res.status(400).json({ 
                success: false,
                msg: 'Token de verificación es requerido' 
            });
        }

        logger.info(`Email verification attempt with token: ${token.substring(0, 8)}...`);

        // Buscar usuario con este token en la tabla profiles
        const { data: profile, error: profileError } = await UserModel.supabase
            .from('profiles')
            .select('user_id, email, email_verified, verification_token, verification_sent_at')
            .eq('verification_token', token)
            .single();

        if (profileError || !profile) {
            logger.warn(`Email verification failed - invalid token: ${token.substring(0, 8)}...`);
            return res.status(400).json({ 
                success: false,
                msg: 'Token de verificación inválido o expirado' 
            });
        }

        // Verificar si el email ya está verificado
        if (profile.email_verified) {
            logger.info(`Email already verified for user: ${profile.email}`);
            return res.json({ 
                success: true,
                msg: 'El email ya ha sido verificado anteriormente' 
            });
        }

        // Verificar si el token ha expirado (24 horas)
        const tokenAge = Date.now() - new Date(profile.verification_sent_at).getTime();
        const maxAge = 24 * 60 * 60 * 1000; // 24 horas en ms
        
        if (tokenAge > maxAge) {
            logger.warn(`Email verification token expired for user: ${profile.email}`);
            return res.status(400).json({ 
                success: false,
                msg: 'El token de verificación ha expirado. Solicita uno nuevo.' 
            });
        }

        // Actualizar el perfil como verificado
        const { error: updateError } = await UserModel.supabase
            .from('profiles')
            .update({ 
                email_verified: true,
                verified_at: new Date().toISOString(),
                verification_token: null // Limpiar el token usado
            })
            .eq('user_id', profile.user_id);

        if (updateError) {
            throw updateError;
        }

        logger.info(`Email verified successfully for user: ${profile.email}`);

        // Enviar email de confirmación
        try {
            await emailService.sendEmailVerifiedConfirmation(profile.email);
            logger.info(`Verification confirmation email sent to ${profile.email}`);
        } catch (emailError) {
            logger.warn(`Failed to send verification confirmation email to ${profile.email}:`, emailError);
            // No fallar la verificación si el email no se envía
        }

        res.json({ 
            success: true,
            msg: 'Email verificado exitosamente',
            email: profile.email
        });
    } catch (error) {
        logger.error('Email verification error:', error);
        res.status(500).json({ 
            success: false,
            msg: 'Error en el servidor durante la verificación' 
        });
    }
};

// Función para reenviar email de verificación
exports.resendVerificationEmail = async (req, res) => {
    const { email } = req.body;

    try {
        if (!email) {
            return res.status(400).json({ 
                success: false,
                msg: 'Email es requerido' 
            });
        }

        logger.info(`Resend verification email request for: ${email}`);

        // Buscar usuario en la tabla profiles
        const { data: profile, error: profileError } = await UserModel.supabase
            .from('profiles')
            .select('user_id, email, email_verified, verification_token')
            .eq('email', email)
            .single();

        if (profileError || !profile) {
            logger.warn(`Resend verification failed - user not found: ${email}`);
            return res.status(404).json({ 
                success: false,
                msg: 'Usuario no encontrado' 
            });
        }

        // Verificar si el email ya está verificado
        if (profile.email_verified) {
            logger.info(`Email already verified, no need to resend: ${email}`);
            return res.json({ 
                success: true,
                msg: 'El email ya ha sido verificado' 
            });
        }

        // Generar nuevo token si no existe o regenerarlo
        const newToken = require('crypto').randomUUID();
        
        // Actualizar token en la base de datos
        const { error: updateError } = await UserModel.supabase
            .from('profiles')
            .update({ 
                verification_token: newToken,
                verification_sent_at: new Date().toISOString()
            })
            .eq('user_id', profile.user_id);

        if (updateError) {
            throw updateError;
        }

        // Construir URL de verificación
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
        const verificationUrl = `${frontendUrl}/verify-email?token=${newToken}`;

        // Enviar email de verificación
        const emailResult = await emailService.sendVerificationEmail(
            email,
            email.split('@')[0],
            verificationUrl,
            newToken
        );

        if (!emailResult.success) {
            logger.error(`Failed to send verification email to ${email}:`, emailResult.error);
            return res.status(500).json({ 
                success: false,
                msg: 'Error al enviar el email de verificación' 
            });
        }

        logger.info(`Verification email resent successfully to ${email}`);

        res.json({ 
            success: true,
            msg: 'Email de verificación reenviado exitosamente' 
        });
    } catch (error) {
        logger.error('Resend verification email error:', error);
        res.status(500).json({ 
            success: false,
            msg: 'Error en el servidor' 
        });
    }
};

// Función para obtener información del usuario actual
exports.getCurrentUser = async (req, res) => {
    try {
        const userId = req.user;
        
        // En este caso, la información ya está en el token JWT
        // Pero podrías hacer una consulta adicional si necesitas más datos
        
        res.json({
            success: true,
            user: {
                id: userId,
                // Agregar más campos si es necesario
            }
        });
    } catch (error) {
        logger.error('Error getting current user:', error);
        res.status(500).json({ 
            success: false,
            msg: 'Error al obtener información del usuario' 
        });
    }
};