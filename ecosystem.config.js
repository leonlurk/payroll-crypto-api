module.exports = {
  apps: [{
    name: 'payroll-crypto-api',
    script: 'server.js',
    cwd: 'C:/Users/Administrator/Desktop/broker/payroll-crypto-api',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // PM2 Configuration
    watch: false,
    ignore_watch: ['node_modules', 'logs', '.git'],
    max_memory_restart: '500M',
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,
    
    // Logging
    log_file: 'C:/Users/Administrator/Desktop/broker/payroll-crypto-api/logs/combined.log',
    out_file: 'C:/Users/Administrator/Desktop/broker/payroll-crypto-api/logs/out.log',
    error_file: 'C:/Users/Administrator/Desktop/broker/payroll-crypto-api/logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Advanced Configuration
    kill_timeout: 1600,
    wait_ready: true,
    listen_timeout: 3000,
    
    // Auto restart on file changes (only for development)
    autorestart: true,
    
    // Environment variables
    env_file: '.env'
  }]
};