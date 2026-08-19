/** Minimal chainable supabase-js stand-in for repository-free query helpers. */
export type SupabaseMockCall = { method: string; args: unknown[] }
export type SupabaseMockTableHandler = (calls: SupabaseMockCall[]) => unknown[]

export function createSupabaseQueryMock(
  tables: Record<string, SupabaseMockTableHandler | unknown[]>,
) {
  const seen: Array<{ table: string; calls: SupabaseMockCall[] }> = []
  const from = (table: string) => {
    const calls: SupabaseMockCall[] = []
    seen.push({ table, calls })
    const resolve = () => {
      const handler = tables[table]
      const rows = typeof handler === 'function' ? handler(calls) : (handler ?? [])
      return { data: rows, error: null }
    }
    const builder: Record<string, unknown> = {}
    for (const method of [
      'select',
      'eq',
      'is',
      'in',
      'or',
      'gte',
      'ilike',
      'not',
      'order',
      'limit',
    ]) {
      builder[method] = (...args: unknown[]) => {
        calls.push({ method, args })
        return builder
      }
    }
    builder.maybeSingle = async () => {
      const { data } = resolve()
      return { data: (data as unknown[])[0] ?? null, error: null }
    }
    builder.then = (
      onFulfilled: (value: unknown) => unknown,
      onRejected?: (error: unknown) => unknown,
    ) => Promise.resolve(resolve()).then(onFulfilled, onRejected)
    return builder
  }
  return { client: { from } as never, seen }
}
