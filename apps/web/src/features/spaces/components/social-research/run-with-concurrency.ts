/**
 * Bounded-parallel worker pool for bulk research actions (analyze-all etc.).
 * Each item failure is isolated — one bad post must not abort the batch; the
 * per-item UI state (analyzing flags) reports individual outcomes.
 */
export async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items]
  const lanes = Array.from({ length: Math.max(1, Math.min(limit, queue.length)) }, async () => {
    for (;;) {
      const next = queue.shift()
      if (next === undefined) return
      await worker(next).catch(() => undefined)
    }
  })
  await Promise.all(lanes)
}

/** Matches the backend's baseline/scoring concurrency — parallel without slamming upstream. */
export const BULK_ANALYZE_CONCURRENCY = 4
