import path from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('test'),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@vibey/api-shared': path.resolve(__dirname, '../../packages/api-shared/src'),
      '@vibey/api-shared/observability': path.resolve(
        __dirname,
        '../../packages/api-shared/src/observability/public.ts',
      ),
      '@vibey/api-shared/ad-strategies': path.resolve(
        __dirname,
        '../../packages/api-shared/src/ad-strategies.ts',
      ),
      '@vibey/api-shared/image-models': path.resolve(
        __dirname,
        '../../packages/api-shared/src/image-models.ts',
      ),
      '@vibey/api-shared/sanitize-fathom-summary-markdown': path.resolve(
        __dirname,
        '../../packages/api-shared/src/sanitize-fathom-summary-markdown.ts',
      ),
      '@vibey/db': path.resolve(__dirname, '../../packages/db/src'),
    },
  },
})
