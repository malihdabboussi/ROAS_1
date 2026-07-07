import assert from 'node:assert/strict'
import { test } from 'node:test'
import { checkAllowlistOnlyShrinks } from './check-loc.mjs'

const EMPTY_ALLOWLIST = {
  files: {},
  webFeatureImports: {},
  controllerSupabaseFiles: {},
}

test('checkAllowlistOnlyShrinks rejects new allowlist entries', () => {
  const errors = []
  checkAllowlistOnlyShrinks(
    {
      ...EMPTY_ALLOWLIST,
      files: {
        'apps/api/src/modules/example/services/example.service.ts': { lines: 601 },
      },
    },
    errors,
    { enabled: true, baseAllowlist: EMPTY_ALLOWLIST },
  )

  assert.equal(errors.length, 1)
  assert.match(errors[0], /new files allowlist entry/)
})

test('checkAllowlistOnlyShrinks allows removed allowlist entries', () => {
  const errors = []
  checkAllowlistOnlyShrinks(EMPTY_ALLOWLIST, errors, {
    enabled: true,
    baseAllowlist: {
      ...EMPTY_ALLOWLIST,
      files: {
        'apps/api/src/modules/legacy/services/legacy.service.ts': { lines: 900 },
      },
    },
  })

  assert.deepEqual(errors, [])
})
