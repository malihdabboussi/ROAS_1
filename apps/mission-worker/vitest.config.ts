import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    globals: false,
  },
  resolve: {
    alias: [
      {
        find: /^@vibey\/api-shared\/(.*)$/,
        replacement: path.resolve(__dirname, '../../packages/api-shared/src') + '/$1',
      },
      {
        find: '@vibey/api-shared',
        replacement: path.resolve(__dirname, '../../packages/api-shared/src/index.ts'),
      },
    ],
  },
})
