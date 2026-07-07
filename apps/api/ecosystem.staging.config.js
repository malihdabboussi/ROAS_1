const fs = require('fs')
const path = require('path')

const envFile = fs.readFileSync(path.join(__dirname, '.env.staging'), 'utf-8')
const env = {}
envFile.split('\n').forEach((line) => {
  line = line.trim()
  if (!line || line.startsWith('#')) return
  const eqIdx = line.indexOf('=')
  if (eqIdx === -1) return
  env[line.slice(0, eqIdx)] = line.slice(eqIdx + 1)
})

module.exports = {
  apps: [
    {
      name: 'vibey-api-staging',
      script: '/root/repos/VibeyV2/apps/api/dist/main.js',
      cwd: '/root/repos/VibeyV2/apps/api',
      node_args: '',
      env,
    },
  ],
}
