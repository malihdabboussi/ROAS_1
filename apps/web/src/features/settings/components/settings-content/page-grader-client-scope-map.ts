import { visiblePipelineClients } from '@/lib/agency-clients'

export function filterPageGraderClientsByQuery<
  T extends { id?: string; name: string; status?: string; pipeline_stage?: string },
>(
  clients: T[],
  query: string,
  opts?: { includeHidden?: boolean; alwaysIncludeIds?: Iterable<string> },
): T[] {
  return visiblePipelineClients(clients, { query, ...opts })
}
