import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import tsParser from '@typescript-eslint/parser'
import nextPlugin from '@next/eslint-plugin-next'

const __dirname = dirname(fileURLToPath(import.meta.url))
const archAllowlistPath = resolve(__dirname, 'scripts/arch/loc-allowlist.json')
const archAllowlist = existsSync(archAllowlistPath)
  ? JSON.parse(readFileSync(archAllowlistPath, 'utf8'))
  : { files: {}, webFeatureImports: {}, controllerSupabaseFiles: {} }
const locAllowlistedFiles = Object.keys(archAllowlist.files ?? {})
const webFeatureImportAllowlistedFiles = Object.keys(archAllowlist.webFeatureImports ?? {})
const controllerSupabaseAllowlistedFiles = Object.keys(
  archAllowlist.controllerSupabaseFiles ?? {},
)
const featuresDir = resolve(__dirname, 'apps/web/src/features')
const webFeatureNames = existsSync(featuresDir)
  ? readdirSync(featuresDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
  : []

const maxLines = (max) => ['error', { max, skipBlankLines: false, skipComments: false }]

const webCrossFeatureImportRules = webFeatureNames.map((feature) => ({
  files: [`apps/web/src/features/${feature}/**/*.{ts,tsx}`],
  ignores: [
    ...webFeatureImportAllowlistedFiles,
    'apps/web/src/features/**/*.test.{ts,tsx}',
    'apps/web/src/features/**/*.spec.{ts,tsx}',
    'apps/web/src/features/**/__tests__/**/*.{ts,tsx}',
  ],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: webFeatureNames
              .filter((target) => target !== feature)
              .flatMap((target) => [`@/features/${target}`, `@/features/${target}/**`]),
            message: 'Features may not import other features. Move shared code to @/lib or @/components.',
          },
        ],
      },
    ],
  },
}))

const backendControllerSupabaseRule = [
  'error',
  {
    selector:
      "CallExpression[callee.property.name='from'][callee.object.type='Identifier'][callee.object.name=/supabase/i]",
    message: 'Controllers must not call supabase.from directly. Move data access to a service or repository.',
  },
  {
    selector:
      "CallExpression[callee.property.name='from'][callee.object.property.name='supabase']",
    message: 'Controllers must not call request.supabase.from directly. Move data access to a service or repository.',
  },
]

export default [
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
    },
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      '@next/next/no-img-element': 'off',
    },
  },
  {
    files: ['**/*.controller.ts'],
    rules: {
      'max-lines': maxLines(200),
    },
  },
  {
    files: ['**/*.service.ts'],
    rules: {
      'max-lines': maxLines(600),
    },
  },
  {
    files: ['**/*.repository.ts'],
    rules: {
      'max-lines': maxLines(400),
    },
  },
  {
    files: ['apps/web/src/**/containers/**/*.tsx'],
    rules: {
      'max-lines': maxLines(600),
    },
  },
  {
    files: ['apps/web/src/features/**/*.tsx', 'apps/web/src/components/**/*.tsx'],
    ignores: ['apps/web/src/**/containers/**/*.tsx'],
    rules: {
      'max-lines': maxLines(400),
    },
  },
  ...(locAllowlistedFiles.length > 0
    ? [
        {
          files: locAllowlistedFiles,
          rules: {
            'max-lines': 'off',
          },
        },
      ]
    : []),
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    ignores: [
      'apps/web/src/middleware.ts',
      'apps/web/src/app/(auth)/callback/route.ts',
      'apps/web/src/app/api/proxy/[...path]/route.ts',
      'apps/web/src/lib/supabase/**/*.ts',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.property.name='from'][callee.object.type='Identifier'][callee.object.name=/supabase/i]",
          message:
            'Direct Supabase queries are not allowed in apps/web. Use backendGet/backendPost/backendPatch from lib/api/backend-client.ts',
        },
      ],
    },
  },
  ...webCrossFeatureImportRules,
  {
    files: ['apps/api/src/**/*.controller.ts', 'apps/agent-api/src/**/*.controller.ts'],
    rules: {
      'no-restricted-syntax': backendControllerSupabaseRule,
    },
  },
  ...(controllerSupabaseAllowlistedFiles.length > 0
    ? [
        {
          files: controllerSupabaseAllowlistedFiles,
          rules: {
            'no-restricted-syntax': 'off',
          },
        },
      ]
    : []),
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/coverage/**', '.runtime/**'],
  },
]
