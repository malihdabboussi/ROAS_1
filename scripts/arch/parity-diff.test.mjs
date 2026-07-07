import assert from 'node:assert/strict'
import { test } from 'node:test'
import { compareCapturedContracts } from './parity-diff.mjs'

const BASE_RECORD = {
  name: 'billing status',
  request: {
    method: 'GET',
    path: '/api/billing/status',
  },
  response: {
    status: 200,
    body: {
      plan: { slug: 'pro-monthly' },
      timestamp: '2026-06-08T00:00:00.000Z',
    },
  },
}

test('compareCapturedContracts passes identical responses', () => {
  const diffs = compareCapturedContracts([BASE_RECORD], [structuredClone(BASE_RECORD)])

  assert.deepEqual(diffs, [])
})

test('compareCapturedContracts flags response deltas', () => {
  const changed = structuredClone(BASE_RECORD)
  changed.response.body.plan.slug = 'starter-monthly'

  const diffs = compareCapturedContracts([BASE_RECORD], [changed])

  assert.equal(diffs.length, 1)
  assert.equal(diffs[0].reason, 'response-delta')
  assert.equal(diffs[0].key, 'GET /api/billing/status')
})

test('compareCapturedContracts supports deterministic normalization', () => {
  const changed = structuredClone(BASE_RECORD)
  changed.response.body.timestamp = '2026-06-09T00:00:00.000Z'

  const diffs = compareCapturedContracts([BASE_RECORD], [changed], {
    ignoreJsonPaths: ['response.body.timestamp'],
  })

  assert.deepEqual(diffs, [])
})
