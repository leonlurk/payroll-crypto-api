const logger = require('../utils/logger');
const { addToBlacklist } = require('./blacklist');

/**
 * Middleware Honeypot para detectar y bloquear bots/scanners automáticamente
 * Los honeypots son trampas invisibles para usuarios legítimos pero que los bots encuentran
 */

// Rutas honeypot que solo un bot/scanner intentaría acceder
const HONEYPOT_ROUTES = [
  '/admin.php',
  '/wp-admin',
  '/wp-login.php',
  '/.env.backup',
  '/phpinfo.php',
  '/test.php',
  '/shell.php',
  '/c99.php',
  '/r57.php',
  '/adminer.php',
  '/phpmyadmin/index.php',
  '/.git/config',
  '/.svn/entries',
  '/web.config',
  '/server-status',
  '/server-info',
  '/.aws/credentials',
  '/api/v1/users/admin',
  '/api/swagger.json',
  '/.well-known/security.txt',
  '/actuator/health',
  '/console',
  '/wp-content/uploads',
  '/wordpress',
  '/cms',
  '/cpanel',
  '/webmail',
  '/.DS_Store',
  '/Thumbs.db',
  '/desktop.ini'
];

// Campos honeypot en formularios (campos ocultos que solo bots llenarían)
const HONEYPOT_FIELDS = [
  'email_confirm',  // Campo trampa
  'phone_number_2', // Campo trampa
  'website_url',    // Campo trampa
  'fax_number',     // Campo trampa
  'company_name_2', // Campo trampa
  'h0n3yp0t'        // Campo trampa obvio
];

/**
 * Middleware para rutas honeypot
 * Si alguien intenta acceder a estas rutas, es 100% un bot
 */
const honeypotRoutes = (req, res, next) => {
  const path = req.path.toLowerCase();
  const clientIP = req.ip?.replace('::ffff:', '') || req.connection.remoteAddress;
  
  // Verificar si es una ruta honeypot
  const isHoneypot = HONEYPOT_ROUTES.some(route => 
    path === route.toLowerCase() || path.startsWith(route.toLowerCase())
  );
  
  if (isHoneypot) {
    logger.error(`🍯 HONEYPOT TRIGGERED! Bot detected: ${clientIP} accessing ${req.path}`);
    logger.error(`User-Agent: ${req.headers['user-agent'] || 'Unknown'}`);
    
    // Registrar en monitor de seguridad como CRÍTICO
    if (global.securityMonitor) {
      global.securityMonitor.recordSuspiciousActivity(clientIP, {
        type: 'HONEYPOT_TRIGGERED',
        path: req.path,
        method: req.method,
        userAgent: req.headers['user-agent'] || 'Unknown',
        severity: 'CRITICAL',
        headers: req.headers
      });
    }
    
    // Bloquear IP inmediatamente
    addToBlacklist(clientIP);
    
    // Log detallado para análisis
    logger.error(`HONEYPOT DETAILS:`, {
      ip: clientIP,
      path: req.path,
      method: req.method,
      headers: req.headers,
      query: req.query,
      timestamp: new Date().toISOString()
    });
    
    // Responder con un 404 falso para no delatar el honeypot
    // Opcionalmente, podríamos responder con un HTML falso
    setTimeout(() => {
      res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>404 Not Found</title></head>
        <body>
          <h1>Not Found</h1>
          <p>The requested URL ${req.path} was not found on this server.</p>
          <hr>
          <address>Apache/2.4.41 (Ubuntu) Server at ${req.hostname} Port 443</address>
        </body>
        </html>
      `);
    }, Math.random() * 2000 + 1000); // Delay aleatorio 1-3 segundos
    
    return; // No continuar con next()
  }
  
  next();
};

/**
 * Middleware para detectar campos honeypot en formularios
 * Si un bot llena campos ocultos, lo detectamos
 */
const honeypotFields = (req, res, next) => {
  const clientIP = req.ip?.replace('::ffff:', '') || req.connection.remoteAddress;
  
  // Verificar si algún campo honeypot fue llenado
  const honeypotTriggered = HONEYPOT_FIELDS.some(field => {
    const value = req.body[field] || req.query[field];
    return value && value.toString().trim().length > 0;
  });
  
  if (honeypotTriggered) {
    logger.error(`🍯 HONEYPOT FIELD TRIGGERED! Bot detected: ${clientIP}`);
    logger.error(`Filled fields:`, {
      body: req.body,
      query: req.query
    });
    
    // Registrar en monitor de seguridad
    if (global.securityMonitor) {
      global.securityMonitor.recordSuspiciousActivity(clientIP, {
        type: 'HONEYPOT_FIELD_FILLED',
        path: req.path,
        method: req.method,
        filledFields: Object.keys(req.body).concat(Object.keys(req.query)),
        severity: 'HIGH'
      });
    }
    
    // Bloquear IP
    addToBlacklist(clientIP);
    
    // Responder con error genérico
    res.status(400).json({
      error: true,
      message: 'Invalid request'
    });
    
    return;
  }
  
  next();
};

/**
 * Middleware para detectar comportamiento de bot por velocidad
 * Los bots suelen hacer requests muy rápidos
 */
const speedTrap = (() => {
  const requestTimes = new Map();
  const MINIMUM_HUMAN_TIME = 50; // REDUCIDO a 50ms - permitir navegación muy rápida
  
  return (req, res, next) => {
    // Ignorar peticiones OPTIONS (CORS preflight)
    if (req.method === 'OPTIONS') {
      return next();
    }
    
    const clientIP = req.ip?.replace('::ffff:', '') || req.connection.remoteAddress;
    const now = Date.now();
    
    if (requestTimes.has(clientIP)) {
      const lastTime = requestTimes.get(clientIP);
      const timeDiff = now - lastTime;
      
      // Solo detectar como bot si hace más de 10 requests por segundo (menos de 100ms)
      if (timeDiff < MINIMUM_HUMAN_TIME) {
        logger.warn(`⚡ BOT BEHAVIOR DETECTED: ${clientIP} - Requests too fast (${timeDiff}ms)`);
        
        if (global.securityMonitor) {
          global.securityMonitor.recordSuspiciousActivity(clientIP, {
            type: 'BOT_SPEED_DETECTED',
            timeBetweenRequests: timeDiff,
            path: req.path,
            method: req.method,
            severity: 'LOW' // Cambiado a LOW - no es tan crítico
          });
        }
        
        // No bloquear inmediatamente, pero registrar
        // El securityMonitor se encargará si hay múltiples violaciones
      }
    }
    
    requestTimes.set(clientIP, now);
    
    // Limpiar entradas antiguas cada 100 requests
    if (requestTimes.size > 100) {
      const cutoff = now - 60000; // 1 minuto
      for (const [ip, time] of requestTimes.entries()) {
        if (time < cutoff) {
          requestTimes.delete(ip);
        }
      }
    }
    
    next();
  };
})();

/**
 * Crear una ruta honeypot fake que parezca vulnerable
 */
const createHoneypotEndpoint = (app) => {
  // Endpoint falso que parece exponer información sensible
  app.get('/.env', (req, res) => {
    const clientIP = req.ip?.replace('::ffff:', '') || req.connection.remoteAddress;
    
    logger.error(`🍯🍯🍯 CRITICAL HONEYPOT HIT: ${clientIP} attempted to access /.env`);
    
    // Bloqueo inmediato y permanente
    if (global.securityMonitor) {
      // Registrar múltiples veces para trigger inmediato
      for (let i = 0; i < 10; i++) {
        global.securityMonitor.recordSuspiciousActivity(clientIP, {
          type: 'CRITICAL_HONEYPOT_ENV',
          severity: 'EXTREME'
        });
      }
    }
    
    // Responder con datos falsos para perder el tiempo del atacante
    setTimeout(() => {
      res.type('text').send(`
# Fake environment file - Honeypot
DB_HOST=localhost
DB_USER=root
DB_PASS=admin123
SECRET_KEY=thisisafakesecret
API_KEY=fake-api-key-honeypot
ADMIN_PASSWORD=gotcha!
      `);
    }, 3000);
  });
};

module.exports = {
  honeypotRoutes,
  honeypotFields,
  speedTrap,
  createHoneypotEndpoint,
  HONEYPOT_ROUTES,
  HONEYPOT_FIELDS
};