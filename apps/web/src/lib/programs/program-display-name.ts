/** UI label for a Program. System "clients" is a campaign/Space grouping, not agency Clients. */
export function programDisplayName(program: { name: string; system_kind?: string | null }): string {
  if (program.system_kind === 'clients') return 'Client Spaces'
  return program.name
}
