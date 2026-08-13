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
        find: /^@vibey\/agent-policy\/(.*)$/,
        replacement: path.resolve(__dirname, '../../packages/agent-policy/src') + '/$1',
      },
      {
        find: '@vibey/agent-policy',
        replacement: path.resolve(__dirname, '../../packages/agent-policy/src/index.ts'),
      },
      {
        find: /^@vibey\/context-breakdown\/(.*)$/,
        replacement: path.resolve(__dirname, '../../packages/context-breakdown/src') + '/$1',
      },
      {
        find: '@vibey/context-breakdown',
        replacement: path.resolve(__dirname, '../../packages/context-breakdown/src/index.ts'),
      },
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
