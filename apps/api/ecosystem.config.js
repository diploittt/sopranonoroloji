/* ═══════════════════════════════════════════════════════════
   PM2 Ecosystem — Production Deployment Config
   Zero-downtime: cluster mode + rolling restart
   ═══════════════════════════════════════════════════════════ */

module.exports = {
  apps: [
    {
      name: 'soprano-api',
      script: 'dist/main.js',
      cwd: '/root/soprano-api/apps/api',
      instances: 2,                    // Cluster: 2 instance (Hetzner 2-4 CPU)
      exec_mode: 'cluster',           // Zero-downtime rolling restart
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
      wait_ready: true,                // app → process.send('ready') bekle

      // Logging
      error_file: '/root/soprano-api/logs/pm2-error.log',
      out_file: '/root/soprano-api/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Auto-restart
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',

      // Watch (dev only — production'da false)
      watch: false,
    },
  ],

  // Deploy config (opsiyonel)
  deploy: {
    production: {
      user: 'root',
      host: '89.167.62.242',
      ref: 'origin/main',
      repo: 'git@github.com:ahmedfirat21-dotcom/yilmazbudur.git',
      path: '/root/soprano-api',
      'post-deploy': 'cd apps/api && npm install && npm run build && npx prisma generate && npx prisma db push && pm2 reload ecosystem.config.js --env production',
    },
  },
};
