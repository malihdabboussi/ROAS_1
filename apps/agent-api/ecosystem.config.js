module.exports = {
  apps: [
    {
      name: 'vibey-agent-api',
      script: 'dist/main.js',
      cwd: '/root/vibey2.0/apps/agent-api',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
      },
      watch: false,
      max_memory_restart: '512M',
      error_file: '/root/logs/agent-api-error.log',
      out_file: '/root/logs/agent-api-out.log',
      merge_logs: true,
      time: true,
    },
  ],
}
