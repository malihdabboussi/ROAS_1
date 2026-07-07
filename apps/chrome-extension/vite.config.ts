import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

function originToPattern(raw: string): string {
  const u = new URL(raw)
  if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
    return `${u.protocol}//${u.hostname}/*`
  }
  return `${u.origin}/*`
}

function manifestHostPermissions(): Plugin {
  let resolvedEnv: Record<string, string> = {}
  return {
    name: 'vibey-manifest-host-permissions',
    configResolved(config) {
      resolvedEnv = loadEnv(config.mode, config.root, 'VITE_')
    },
    writeBundle({ dir }) {
      if (!dir) return
      const out = resolve(dir, 'manifest.json')
      const src = readFileSync(out, 'utf-8')
      if (!src.includes('__VIBEY_HOST_PERMISSIONS__')) return

      const envApp = resolvedEnv.VITE_VIBEY_APP_ORIGIN || 'http://localhost:3000'
      const envWeb = resolvedEnv.VITE_VIBEY_WEB_ORIGIN || envApp
      const envApi = resolvedEnv.VITE_VIBEY_API_ORIGIN || 'http://localhost:3001'
      const envSupa = resolvedEnv.VITE_SUPABASE_URL || ''

      const perms = new Set<string>()
      perms.add(originToPattern(envApp))
      perms.add(originToPattern(envWeb))
      perms.add(originToPattern(envApi))
      if (envSupa) perms.add(originToPattern(envSupa))
      perms.add('https://*.instagram.com/*')
      perms.add('https://*.facebook.com/*')
      perms.add('https://*.x.com/*')
      perms.add('https://*.twitter.com/*')
      perms.add('https://*.tiktok.com/*')
      perms.add('https://*.linkedin.com/*')
      perms.add('https://*.youtube.com/*')
      perms.add('https://*.reddit.com/*')

      const manifest = JSON.parse(src) as Record<string, unknown>
      manifest.host_permissions = [...perms]
      writeFileSync(out, JSON.stringify(manifest, null, 2) + '\n')
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), manifestHostPermissions()],
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        sidepanel: resolve(__dirname, 'sidepanel.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
})
