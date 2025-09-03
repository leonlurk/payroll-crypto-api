const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Rate limiter MODERADO para producción
const createRateLimiter = (options = {}) => {
  const defaults = {
    windowMs: 1 * 60 * 1000, // Ventana de 1 minuto
    max: 100, // INCREMENTADO: Máximo 100 requests por ventana
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    
    // Handler personalizado cuando se excede el límite
    handler: (req, res, next) => {
      const clientIP = req.ip?.replace('::ffff:', '') || req.connection.remoteAddress;
      logger.error(`🚫 RATE LIMIT EXCEEDED: IP ${clientIP} - Path: ${req.path}`);
      
      // Registrar en monitor de seguridad
      if (global.securityMonitor) {
        global.securityMonitor.recordSuspiciousActivity(clientIP, {
          type: 'RATE_LIMIT_EXCEEDED',
          path: req.path,
          method: req.method,
          userAgent: req.headers['user-agent'] || 'Unknown'
        });
      }
      
      res.status(429).json({
        error: true,
        message: 'Too many requests. You have been rate limited.',
        retryAfter: Math.round(req.rateLimit.resetTime / 1000) || 60
      });
    },
    
    // Skip para IPs confiables (opcional)
    skip: (req, res) => {
      const trustedIPs = [
        '127.0.0.1',
        '::1',
        // Agregar IPs confiables aquí si es necesario
      ];
      const clientIP = req.ip?.replace('::ffff:', '') || req.connection.remoteAddress;
      return trustedIPs.includes(clientIP);
    }
  };
  
  return rateLimit({ ...defaults, ...options });
};

// Rate limiter específico para endpoints de autenticación (MODERADO)
const authRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 20, // INCREMENTADO: 20 intentos de login cada 5 minutos
  skipSuccessfulRequests: false,
  message: 'Too many authentication attempts. Please wait 5 minutes.'
});

// Rate limiter para endpoints críticos (wallets, transferencias)
const criticalRateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 10, // Solo 10 requests por minuto
  message: 'Too many requests to critical endpoint.'
});

// Rate limiter global (aplicar a toda la aplicación)
const globalRateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 200, // INCREMENTADO: 200 requests por minuto máximo
  message: 'Global rate limit exceeded.'
});

// Rate limiter para prevenir ataques de fuerza bruta
const bruteForceLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 3, // Solo 3 intentos fallidos
  skipSuccessfulRequests: true, // Solo cuenta los fallidos
  handler: (req, res) => {
    const clientIP = req.ip?.replace('::ffff:', '') || req.connection.remoteAddress;
    logger.error(`🔴 BRUTE FORCE DETECTED: IP ${clientIP} exceeded failed attempts limit`);
    
    // Registrar como ataque de fuerza bruta
    if (global.securityMonitor) {
      global.securityMonitor.recordSuspiciousActivity(clientIP, {
        type: 'BRUTE_FORCE_ATTEMPT',
        path: req.path,
        method: req.method,
        severity: 'HIGH'
      });
    }
    
    res.status(429).json({
      error: true,
      message: 'Account temporarily locked due to multiple failed attempts.',
      lockDuration: '15 minutes'
    });
  }
});

module.exports = {
  createRateLimiter,
  authRateLimiter,
  criticalRateLimiter,
  globalRateLimiter,
  bruteForceLimiter
};