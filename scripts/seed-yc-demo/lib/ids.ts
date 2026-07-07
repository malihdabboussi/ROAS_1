/**
 * Deterministic UUID generation for the YC demo seeder.
 *
 * Every row the seeder inserts gets its UUID from `id(kind, ...parts)` so
 * re-runs produce the exact same IDs. This makes:
 *   - the script idempotent (re-inserts upsert on the same id),
 *   - --reset clean (we know every id we ever created),
 *   - forward-referencing safe (Phase A can compute the id of a row Phase B
 *     will create, without coordinating).
 *
 * Algorithm: UUID v5 (SHA-1 namespacing) anchored at ROOT_NAMESPACE.
 */
import { createHash } from 'node:crypto'

/** Stable random namespace for the YC demo. Do not change — would re-id everything. */
const ROOT_NAMESPACE_HEX = 'f6c5d8a1b40e4d72a3e8c4b7d2f1e9a3'

const ROOT_NAMESPACE = Buffer.from(ROOT_NAMESPACE_HEX, 'hex')

function uuidv5(name: string, namespace: Buffer = ROOT_NAMESPACE): string {
  const hash = createHash('sha1')
    .update(Buffer.concat([namespace, Buffer.from(name)]))
    .digest()
  hash[6] = (hash[6]! & 0x0f) | 0x50
  hash[8] = (hash[8]! & 0x3f) | 0x80
  return [
    hash.subarray(0, 4).toString('hex'),
    hash.subarray(4, 6).toString('hex'),
    hash.subarray(6, 8).toString('hex'),
    hash.subarray(8, 10).toString('hex'),
    hash.subarray(10, 16).toString('hex'),
  ].join('-')
}

/**
 * Generate a deterministic UUID from a kind tag and any number of parts.
 *
 *   id('memory', 'founder', 'voice-memo-001')
 *   id('snapshot', 'user-brain', 'snap-pricing-clarity')
 *   id('contact', 'acme-cto')
 *
 * Same arguments → same UUID, every run.
 */
export function id(kind: string, ...parts: string[]): string {
  return uuidv5([kind, ...parts].join(':'))
}

/**
 * Create a sub-namespace so a content module can mint many IDs without
 * leaking its prefix scheme into the global namespace.
 *
 *   const memId = subNamespace('user-brain-memory')
 *   const a = memId('founding-vision')      // stable
 *   const b = memId('pricing-debate-week-4')  // stable
 */
export function subNamespace(prefix: string): (...parts: string[]) => string {
  return (...parts: string[]) => id(prefix, ...parts)
}

/** Convenience export so consumers can pass `ids` as a single object. */
export const ids = { id, subNamespace }
export type Ids = typeof ids
