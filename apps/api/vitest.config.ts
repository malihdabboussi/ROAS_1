import path from 'path'
import swc from 'unplugin-swc'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    root: path.resolve(__dirname),
    include: ['src/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['src/test/setup.ts'],
    globals: true,
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@vibey/api-shared': path.resolve(__dirname, '../../packages/api-shared/src/index.ts'),
      '@vibey/agent-policy': path.resolve(__dirname, '../../packages/agent-policy/src'),
    },
  },
})
