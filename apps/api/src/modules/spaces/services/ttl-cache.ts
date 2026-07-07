/**
 * In-memory TTL cache for idempotent, credit-charging upstream reads.
 *
 * When a transport blip drops a response *after* the backend already did the
 * work (and charged), a client self-heal retry re-hits the same operation. A
 * short-TTL cache returns the already-produced (already-paid-for) result instead
 * of calling — and charging — upstream again. Entries are evicted lazily on read.
 *
 * Scope is per-process (per backend instance): a full instance restart starts
 * cold, so this guards same-instance retries, not cross-instance ones. A shared
 * (Redis) store or a request idempotency key would close that remaining gap.
 */
export class TtlCache<T> {
  private readonly store = new Map<string, { value: T; fetchedAt: number }>()

  constructor(private readonly ttlMs: number) {}

  get(key: string): T | null {
    const hit = this.store.get(key)
    if (!hit) return null
    if (Date.now() - hit.fetchedAt > this.ttlMs) {
      this.store.delete(key)
      return null
    }
    return hit.value
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, fetchedAt: Date.now() })
  }

  delete(key: string): void {
    this.store.delete(key)
  }
}
