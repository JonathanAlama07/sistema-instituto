module.exports = {
  apps: [{
    name: 'instituto-web',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // Configuración para PM2
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    // Prevenir que la aplicación se reinicie constantemente
    min_uptime: '10s',
    max_restarts: 10,
    // Variables de entorno específicas de producción
    env: {
      DB_HOST: 'localhost',
      DB_PORT: 5432,
      DB_NAME: 'instituto_db',
      DB_USER: 'postgres',
      DB_PASSWORD: '123456',
      JWT_SECRET: 'RLuRYtcliw53MrfBjKho1HdAeeEaTl3zmsIe',
      NODE_ENV: 'production'
    }
  }],

  deploy: {
    production: {
      user: 'SSH_USERNAME',
      host: 'SSH_HOSTMACHINE',
      ref: 'origin/main',
      repo: 'GIT_REPOSITORY',
      path: '/var/www/instituto-web',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run init-db && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};