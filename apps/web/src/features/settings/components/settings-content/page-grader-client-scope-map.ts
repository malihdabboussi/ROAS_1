export function filterPageGraderClientsByQuery<T extends { name: string }>(
  clients: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase()
  if (!q) return clients
  return clients.filter((client) => client.name.toLowerCase().includes(q))
}
