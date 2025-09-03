// Importar librerías
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Importar rutas
const userRoutes = require('./routes/userRoutes');
const walletRoutes = require('./routes/walletRoutes');
const emailRoutes = require('./routes/emailRoutes');
const kycRoutes = require('./routes/kycRoutes');

// Importar utilidades
const logger = require('./utils/logger');
const supabase = require('./config/supabase');

// Importar middleware de seguridad mejorado
const { 
  blockBlacklistedIPs, 
  detectSuspiciousAgents, 
  blockExploitPaths,
  getSecurityStats 
} = require('./middleware/blacklist');
const securityMonitor = require('./services/securityMonitor');
const { 
  globalRateLimiter,
  authRateLimiter,
  criticalRateLimiter,
  bruteForceLimiter
} = require('./middleware/rateLimiter');
const {
  honeypotRoutes,
  honeypotFields,
  speedTrap,
  createHoneypotEndpoint
} = require('./middleware/honeypot');

// Inicializar aplicación Express
const app = express();

// Configurar trust proxy para que Express confíe en los headers de NGINX
// Usar configuración específica para evitar bypass de rate limiting
app.set('trust proxy', 1); // Trust first proxy (NGINX)

// IMPORTANTE: Configurar CORS ANTES del middleware de seguridad para OPTIONS
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            process.env.FRONTEND_URL || 'http://localhost:5173',
            'http://localhost:3000',
            'http://localhost:5173',
            'http://localhost:5174',
            'https://localhost:5174' // También permitir HTTPS
        ];
        
        // Permitir requests sin origin (como Postman)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            logger.warn(`CORS blocked origin: ${origin}`);
            callback(new Error('No permitido por CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
    optionsSuccessStatus: 200
};

// Manejar OPTIONS antes del middleware de seguridad
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

// MIDDLEWARE DE SEGURIDAD (DESPUÉS DE CORS PARA OPTIONS!)
// Excluir peticiones OPTIONS del sistema de seguridad
app.use((req, res, next) => {
    // Las peticiones OPTIONS ya fueron manejadas por CORS
    if (req.method === 'OPTIONS') {
        return next();
    }
    next();
});

// 1. Honeypot - Detectar bots inmediatamente
app.use(honeypotRoutes);
app.use(speedTrap);

// 2. Bloquear IPs en lista negra (excepto OPTIONS)
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') return next();
    blockBlacklistedIPs(req, res, next);
});

// 3. Detectar User-Agents sospechosos (excepto OPTIONS)
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') return next();
    detectSuspiciousAgents(req, res, next);
});

// 4. Bloquear rutas de exploits (excepto OPTIONS)
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') return next();
    blockExploitPaths(req, res, next);
});

// 5. Rate limiting global agresivo (excepto OPTIONS)
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') return next();
    globalRateLimiter(req, res, next);
});

// Configuración de seguridad con Helmet
app.use(helmet());

// Middleware para parsear JSON con límite de tamaño
app.use(express.json({ limit: '1mb' })); // Reducido de 10mb a 1mb
app.use(express.urlencoded({ extended: true, limit: '1mb' })); // Reducido de 10mb a 1mb

// Honeypot para campos de formulario
app.use(honeypotFields);

// Logging con Morgan
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined', {
        stream: {
            write: (message) => logger.info(message.trim())
        }
    }));
}

// Rate Limiting MODERADO
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 200, // INCREMENTADO a 200
    message: 'Demasiadas peticiones desde esta IP, por favor intente de nuevo más tarde.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        const clientIP = req.ip?.replace('::ffff:', '') || req.connection.remoteAddress;
        logger.warn(`Rate limit exceeded for IP: ${clientIP}`);
        res.status(429).json({
            error: true,
            message: 'Demasiadas peticiones desde esta IP',
            retryAfter: '15 minutes'
        });
    }
});

// Rate limiting más estricto para endpoints de autenticación
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 30, // INCREMENTADO a 30 intentos
    message: 'Demasiados intentos de autenticación, por favor intente de nuevo más tarde.',
    skipSuccessfulRequests: true,
    handler: (req, res) => {
        const clientIP = req.ip?.replace('::ffff:', '') || req.connection.remoteAddress;
        logger.error(`Auth rate limit exceeded for IP: ${clientIP}`);
        
        // Registrar en monitor de seguridad
        if (global.securityMonitor) {
            global.securityMonitor.recordSuspiciousActivity(clientIP, {
                type: 'AUTH_RATE_LIMIT_EXCEEDED',
                path: req.path,
                method: req.method,
                severity: 'HIGH'
            });
        }
        
        res.status(429).json({
            error: true,
            message: 'Cuenta temporalmente bloqueada por múltiples intentos',
            retryAfter: '15 minutes'
        });
    }
});

// Aplicar rate limiting global
app.use('/api/', limiter);

// Verificar conexión a Supabase
const checkSupabaseConnection = async () => {
    try {
        const { data, error } = await supabase
            .from('crypto_wallets')
            .select('count', { count: 'exact', head: true });
        
        if (error && error.code !== 'PGRST116') { // PGRST116 es "table doesn't exist"
            throw error;
        }
        
        logger.info('Conectado a Supabase exitosamente');
        console.log('✅ Conectado a Supabase');
        return true;
    } catch (err) {
        logger.error('Error al conectar a Supabase:', err);
        console.error('❌ Error al conectar a Supabase:', err);
        console.error('Verifica que:');
        console.error('1. SUPABASE_URL esté configurada correctamente');
        console.error('2. SUPABASE_SERVICE_KEY esté configurada correctamente');
        console.error('3. Las tablas crypto_wallets y crypto_transactions existan');
        return false;
    }
};

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({
        message: '¡Bienvenido a la API de Payroll Crypto!',
        version: '2.0.0',
        endpoints: {
            auth: {
                register: 'POST /api/users/register',
                login: 'POST /api/users/login'
            },
            wallet: {
                generate: 'POST /api/wallet/generate-wallet',
                balance: 'GET /api/wallet/check-balance',
                history: 'GET /api/wallet/transaction-history',
                transfer: 'POST /api/wallet/transfer-funds',
                confirm: 'POST /api/wallet/confirm-deposit'
            }
        }
    });
});

// Endpoint de estadísticas de seguridad (PROTEGIDO)
app.get('/api/security-stats', (req, res) => {
    // Solo accesible localmente o con token especial
    const clientIP = req.ip?.replace('::ffff:', '') || req.connection.remoteAddress;
    
    if (clientIP !== '127.0.0.1' && clientIP !== '::1' && clientIP !== 'localhost') {
        // Si no es local, requerir token
        const authHeader = req.headers.authorization;
        const securityToken = process.env.SECURITY_TOKEN || process.env.METRICS_TOKEN;
        
        if (!securityToken || authHeader !== `Bearer ${securityToken}`) {
            return res.status(403).json({ 
                error: 'Forbidden',
                message: 'Security stats only available locally or with security token'
            });
        }
    }
    
    res.json({
        monitor: securityMonitor.getSecurityStats(),
        blacklist: getSecurityStats(),
        timestamp: new Date().toISOString()
    });
});

// Aplicar rate limiting específico a rutas de autenticación
app.use('/api/users/login', bruteForceLimiter, authRateLimiter);
app.use('/api/users/register', authRateLimiter);
app.use('/api/users/forgot-password', authRateLimiter);
app.use('/api/users/reset-password', authRateLimiter);

// Aplicar rate limiting crítico a operaciones de wallet
app.use('/api/wallet/transfer-funds', criticalRateLimiter);
app.use('/api/wallet/withdraw', criticalRateLimiter);

// Crear endpoints honeypot
createHoneypotEndpoint(app);

// Definir las rutas
app.use('/api/users', userRoutes);
app.use('/api/auth', userRoutes); // Alias para compatibilidad con frontend
app.use('/api/wallet', walletRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/kyc', kycRoutes);

// Manejo de errores 404
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint no encontrado',
        path: req.originalUrl
    });
});

// Middleware de manejo de errores global
app.use((err, req, res, next) => {
    logger.error('Error no manejado:', err);
    
    // No exponer detalles del error en producción
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Error interno del servidor',
        ...(isDevelopment && { stack: err.stack })
    });
});

// Manejo de promesas rechazadas no capturadas
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Promesa rechazada no manejada:', reason);
    console.error('Promesa rechazada no manejada en:', promise, 'razón:', reason);
});

// Manejo de excepciones no capturadas
process.on('uncaughtException', (error) => {
    logger.error('Excepción no capturada:', error);
    console.error('Excepción no capturada:', error);
    process.exit(1);
});

// Definir el puerto
const PORT = process.env.PORT || 3000;

// El monitor de seguridad ya está inicializado como singleton en su módulo
// y disponible globalmente desde allí

// Iniciar el servidor
const server = app.listen(PORT, async () => {
    logger.info(`Servidor corriendo en el puerto ${PORT}`);
    console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
    console.log(`📝 Documentación disponible en http://localhost:${PORT}/`);
    console.log(`🛡️ Sistema de seguridad ULTRA-AGRESIVO activado`);
    console.log(`🍯 Honeypots desplegados`);
    
    // Verificar conexión a Supabase
    const supabaseConnected = await checkSupabaseConnection();
    if (!supabaseConnected) {
        console.error('❌ No se pudo conectar a Supabase. El servidor continuará pero algunas funciones pueden fallar.');
    }

    // Verificar variables de entorno críticas
    const requiredEnvVars = [
        'SUPABASE_URL',
        'SUPABASE_SERVICE_KEY',
        'JWT_SECRET',
        'ENCRYPTION_KEY',
        'TRON_FULL_HOST',
        'BSC_URL',
        'MAIN_TRON_WALLET',
        'MAIN_BSC_WALLET'
    ];
    
    // Variables opcionales pero recomendadas
    const optionalEnvVars = [
        'TRON_PRIVATE_KEY' // Solo necesaria para transferencias automáticas
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    const missingOptional = optionalEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        logger.warn(`⚠️ Variables de entorno REQUERIDAS faltantes: ${missingVars.join(', ')}`);
        console.warn(`⚠️ Variables de entorno REQUERIDAS faltantes: ${missingVars.join(', ')}`);
        console.warn('Por favor, configura estas variables en tu archivo .env');
    }
    
    if (missingOptional.length > 0) {
        logger.info(`ℹ️ Variables opcionales no configuradas: ${missingOptional.join(', ')}`);
        console.log(`ℹ️ Variables opcionales no configuradas: ${missingOptional.join(', ')}`);
        console.log('Las transferencias automáticas estarán deshabilitadas');
    }

    // Verificar configuración de API keys
    if (process.env.TRON_API_KEY) {
        logger.info('✅ TRON API Key configurada');
        console.log('✅ TRON API Key configurada');
    } else {
        logger.warn('⚠️ TRON API Key no configurada - usando endpoints públicos');
        console.warn('⚠️ TRON API Key no configurada - usando endpoints públicos');
    }

    if (process.env.BSC_API_KEY) {
        logger.info('✅ BSC API Key configurada');
        console.log('✅ BSC API Key configurada');
    } else {
        logger.warn('⚠️ BSC API Key no configurada - usando endpoints públicos');
        console.warn('⚠️ BSC API Key no configurada - usando endpoints públicos');
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM recibido. Cerrando servidor gracefully...');
    server.close(() => {
        logger.info('Servidor cerrado');
        // Ya no necesitamos cerrar conexión de MongoDB
        process.exit(0);
    });
});

module.exports = app;