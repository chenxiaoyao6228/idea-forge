module.exports = {
    apps: [{
      name: 'ideaforge',
      script: 'dist/main.js',
      instances: 'max', 
      exec_mode: 'cluster',
      autorestart: true,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production'
      },
      output: './logs/out.log',
      error: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    }]
  }