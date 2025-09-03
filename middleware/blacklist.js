const logger = require('../utils/logger');

// Lista negra de IPs conocidas como maliciosas (LIMPIADA)
const BLACKLISTED_IPS = new Set([
  // Lista limpia - solo IPs realmente maliciosas se agregaran dinámicamente
]);

// Patrones sospechosos en User-Agent (MENOS AGRESIVO)
const SUSPICIOUS_USER_AGENTS = [
  'Hello World',
  'scanner',
  'nikto',
  'sqlmap',
  'nmap',
  'masscan',
  'zgrab'
  // Removido: bot, crawler, python-requests, curl, etc para permitir uso legítimo
];

// Middleware para bloquear IPs en lista negra
const blockBlacklistedIPs = (req, res, next) => {
  // Permitir siempre peticiones OPTIONS (CORS preflight)
  if (req.method === 'OPTIONS') {
    return next();
  }
  
  const clientIP = req.ip?.replace('::ffff:', '') || req.connection.remoteAddress;
  
  if (BLACKLISTED_IPS.has(clientIP)) {
    logger.error(`🚨 BLOCKED: Blacklisted IP attempt - ${clientIP}`);
    
    // Registrar en monitor de seguridad
    if (global.securityMonitor) {
      global.securityMonitor.recordSuspiciousActivity(clientIP, {
        type: 'BLACKLISTED_ACCESS_ATTEMPT',
        path: req.path,
        method: req.method,
        userAgent: req.headers['user-agent'] || 'Unknown'
      });
    }
    
    res.status(403).json({
      error: true,
      message: 'Access denied'
    });
    return;
  }
  
  next();
};

// Middleware para detectar User-Agents sospechosos
const detectSuspiciousAgents = (req, res, next) => {
  const userAgent = req.headers['user-agent'] || '';
  const clientIP = req.ip?.replace('::ffff:', '') || req.connection.remoteAddress;
  
  const isSuspicious = SUSPICIOUS_USER_AGENTS.some(pattern => 
    userAgent.toLowerCase().includes(pattern.toLowerCase())
  );
  
  if (isSuspicious) {
    logger.warn(`⚠️ SUSPICIOUS: User-Agent "${userAgent}" from IP ${clientIP}`);
    
    // Registrar en monitor de seguridad
    if (global.securityMonitor) {
      global.securityMonitor.recordSuspiciousActivity(clientIP, {
        type: 'SUSPICIOUS_USER_AGENT',
        userAgent: userAgent,
        path: req.path,
        method: req.method,
        headers: req.headers
      });
    }
    
    // Bloquear inmediatamente
    res.status(403).json({
      error: true,
      message: 'Access denied'
    });
    return;
  }
  
  next();
};

// Middleware para detectar intentos de acceso a rutas comunes de exploits (MENOS AGRESIVO)
const blockExploitPaths = (req, res, next) => {
  const exploitPaths = [
    '.php',
    '.asp',
    '.aspx',
    'wp-admin',
    'wp-login',
    'phpmyadmin',
    '.env',
    '.git',
    '.sql',
    'shell',
    '.htaccess',
    '.htpasswd',
    'web.config'
    // Removido: admin, token, wallet, password, etc para permitir rutas legítimas de API
  ];
  
  const path = req.path.toLowerCase();
  const clientIP = req.ip?.replace('::ffff:', '') || req.connection.remoteAddress;
  
  const isExploit = exploitPaths.some(exploit => path.includes(exploit));
  
  if (isExploit) {
    logger.error(`🚨 EXPLOIT ATTEMPT: Path "${req.path}" from IP ${clientIP}`);
    
    // Registrar en monitor de seguridad
    if (global.securityMonitor) {
      global.securityMonitor.recordSuspiciousActivity(clientIP, {
        type: 'EXPLOIT_PATH_ATTEMPT',
        path: req.path,
        method: req.method,
        userAgent: req.headers['user-agent'] || 'Unknown',
        severity: 'CRITICAL'
      });
    }
    
    // Agregar automáticamente a la lista negra
    BLACKLISTED_IPS.add(clientIP);
    
    res.status(404).json({
      error: true,
      message: 'Not found'
    });
    return;
  }
  
  next();
};

// Función para agregar IP a lista negra manualmente
const addToBlacklist = (ip) => {
  BLACKLISTED_IPS.add(ip);
  logger.info(`IP ${ip} added to blacklist`);
};

// Función para obtener estadísticas
const getSecurityStats = () => {
  return {
    blacklistedIPs: Array.from(BLACKLISTED_IPS),
    totalBlocked: BLACKLISTED_IPS.size
  };
};

module.exports = {
  blockBlacklistedIPs,
  detectSuspiciousAgents,
  blockExploitPaths,
  addToBlacklist,
  getSecurityStats
};