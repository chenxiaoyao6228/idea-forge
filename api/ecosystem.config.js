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
      }
    }]
  }