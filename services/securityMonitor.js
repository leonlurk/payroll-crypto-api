const logger = require('../utils/logger');
const { addToBlacklist } = require('../middleware/blacklist');

class SecurityMonitor {
  constructor() {
    this.attackAttempts = new Map(); // IP -> { count, firstSeen, lastSeen, attempts }
    this.suspiciousPatterns = [];
    this.alertThreshold = 50; // INCREMENTADO: Alertar después de 50 intentos
    this.autoBlockThreshold = 100; // INCREMENTADO: Bloquear después de 100 intentos  
    this.timeWindow = 15 * 60 * 1000; // INCREMENTADO: Ventana de 15 minutos
    this.permanentBlockThreshold = 200; // INCREMENTADO: Bloqueo permanente después de 200 intentos
    this.blockedIPs = new Set(); // IPs bloqueadas permanentemente
    this.whitelistedIPs = new Set(['181.89.223.158', '127.0.0.1', '::1', 'localhost']); // IPs permitidas
  }

  // Registrar intento sospechoso
  recordSuspiciousActivity(ip, details) {
    const now = Date.now();
    
    // No registrar actividad de IPs en whitelist
    if (this.whitelistedIPs.has(ip)) {
      return null;
    }

    // Ignorar peticiones OPTIONS (preflight de CORS)
    if (details.method === 'OPTIONS') {
      return null;
    }
    
    if (!this.attackAttempts.has(ip)) {
      this.attackAttempts.set(ip, {
        count: 0,
        firstSeen: now,
        lastSeen: now,
        attempts: []
      });
    }
    
    const record = this.attackAttempts.get(ip);
    record.count++;
    record.lastSeen = now;
    record.attempts.push({
      timestamp: now,
      ...details
    });
    
    // Limpiar intentos antiguos fuera de la ventana de tiempo
    record.attempts = record.attempts.filter(
      attempt => now - attempt.timestamp < this.timeWindow
    );
    
    // Verificar umbrales con acciones más agresivas
    if (record.count >= this.permanentBlockThreshold) {
      this.permanentBlockIP(ip, record);
    } else if (record.count >= this.autoBlockThreshold) {
      this.autoBlockIP(ip, record);
    } else if (record.count >= this.alertThreshold) {
      this.raiseAlert(ip, record);
    }
    
    return record;
  }
  
  // Bloquear IP automáticamente
  autoBlockIP(ip, record) {
    logger.error(`🚨🚨🚨 AUTO-BLOCKING IP: ${ip}`);
    logger.error(`Attack details:`, {
      ip,
      totalAttempts: record.count,
      firstSeen: new Date(record.firstSeen).toISOString(),
      lastSeen: new Date(record.lastSeen).toISOString(),
      recentAttempts: record.attempts.slice(-5) // Últimos 5 intentos
    });
    
    // Agregar a lista negra
    addToBlacklist(ip);
    
    // Notificar (aquí podrías enviar email, SMS, etc.)
    this.sendSecurityNotification({
      severity: 'CRITICAL',
      ip,
      message: `IP ${ip} has been automatically blocked after ${record.count} suspicious attempts`,
      details: record
    });
  }
  
  // Bloqueo permanente en firewall de Windows
  permanentBlockIP(ip, record) {
    if (this.blockedIPs.has(ip)) return; // Ya bloqueado
    
    logger.error(`🔴🔴🔴 PERMANENT FIREWALL BLOCK: ${ip}`);
    logger.error(`CRITICAL: IP ${ip} exceeded permanent block threshold with ${record.count} attempts`);
    
    // Ejecutar comando de firewall de Windows
    const { exec } = require('child_process');
    const ruleName = `Block_Attacker_${ip.replace(/\./g, '_')}`;
    const command = `netsh advfirewall firewall add rule name="${ruleName}" dir=in action=block remoteip=${ip}`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        logger.error(`Failed to block IP in firewall: ${error.message}`);
      } else {
        logger.info(`✅ IP ${ip} permanently blocked in Windows Firewall`);
        this.blockedIPs.add(ip);
      }
    });
    
    // También agregar a blacklist de aplicación
    addToBlacklist(ip);
    
    this.sendSecurityNotification({
      severity: 'EXTREME',
      ip,
      message: `IP ${ip} PERMANENTLY BLOCKED IN FIREWALL after ${record.count} attempts`,
      details: record
    });
  }
  
  // Generar alerta
  raiseAlert(ip, record) {
    logger.warn(`⚠️⚠️ SECURITY ALERT: Suspicious activity from IP ${ip}`);
    logger.warn(`Details:`, {
      ip,
      attempts: record.count,
      timeSpan: `${Math.round((record.lastSeen - record.firstSeen) / 60000)} minutes`,
      recentActivity: record.attempts.slice(-3)
    });
  }
  
  // Enviar notificación (implementar según necesidades)
  sendSecurityNotification(alert) {
    // Aquí podrías integrar:
    // - Email notifications
    // - SMS alerts
    // - Slack/Discord webhooks
    // - Dashboard updates
    
    logger.info(`📨 Security notification queued:`, alert);
    
    // Por ahora solo log, pero aquí iría la integración real
    if (alert.severity === 'CRITICAL') {
      console.log('\n' + '='.repeat(60));
      console.log('🚨 CRITICAL SECURITY ALERT 🚨');
      console.log('IP BLOCKED:', alert.ip);
      console.log('Message:', alert.message);
      console.log('='.repeat(60) + '\n');
    }
  }
  
  // Obtener estadísticas de seguridad
  getSecurityStats() {
    const now = Date.now();
    const activeThreats = [];
    const recentActivity = [];
    
    for (const [ip, record] of this.attackAttempts.entries()) {
      // Solo considerar actividad en la última hora
      if (now - record.lastSeen < this.timeWindow) {
        activeThreats.push({
          ip,
          threatLevel: record.count >= this.autoBlockThreshold ? 'CRITICAL' :
                       record.count >= this.alertThreshold ? 'HIGH' : 'MEDIUM',
          attempts: record.count,
          lastSeen: new Date(record.lastSeen).toISOString()
        });
      }
      
      // Actividad reciente (últimos 15 minutos)
      if (now - record.lastSeen < 15 * 60 * 1000) {
        recentActivity.push({
          ip,
          attempts: record.attempts.filter(a => now - a.timestamp < 15 * 60 * 1000).length
        });
      }
    }
    
    return {
      activeThreats: activeThreats.sort((a, b) => b.attempts - a.attempts),
      recentActivity,
      totalSuspiciousIPs: this.attackAttempts.size,
      criticalThreats: activeThreats.filter(t => t.threatLevel === 'CRITICAL').length,
      highThreats: activeThreats.filter(t => t.threatLevel === 'HIGH').length
    };
  }
  
  // Limpiar registros antiguos (ejecutar periódicamente)
  cleanup() {
    const now = Date.now();
    const oldEntries = [];
    
    for (const [ip, record] of this.attackAttempts.entries()) {
      // Eliminar registros de más de 24 horas sin actividad
      if (now - record.lastSeen > 24 * 60 * 60 * 1000) {
        oldEntries.push(ip);
      }
    }
    
    oldEntries.forEach(ip => this.attackAttempts.delete(ip));
    
    if (oldEntries.length > 0) {
      logger.info(`Cleaned up ${oldEntries.length} old security records`);
    }
  }
}

// Singleton
const securityMonitor = new SecurityMonitor();

// Hacer disponible globalmente
global.securityMonitor = securityMonitor;

// Limpiar registros antiguos cada hora
setInterval(() => {
  securityMonitor.cleanup();
}, 60 * 60 * 1000);

// Mostrar estadísticas cada 5 minutos
setInterval(() => {
  const stats = securityMonitor.getSecurityStats();
  if (stats.activeThreats.length > 0 || stats.recentActivity.length > 0) {
    logger.info('🛡️ SECURITY STATUS:', stats);
  }
}, 5 * 60 * 1000);

module.exports = securityMonitor;