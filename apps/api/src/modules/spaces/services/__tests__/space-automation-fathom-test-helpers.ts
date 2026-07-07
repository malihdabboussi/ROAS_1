export function chain(result: unknown): Record<string, unknown> {
  const api: Record<string, unknown> = {
    select: () => api,
    eq: () => api,
    single: async () => result,
    maybeSingle: async () => result,
    update: () => api,
    insert: () => api,
  }
  return api
}
