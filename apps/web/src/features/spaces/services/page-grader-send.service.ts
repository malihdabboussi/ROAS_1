import { backendGet, backendPost } from '@/lib/api/backend-client'

export type PageGraderClient = {
  id: string
  name: string
  status: string
}

export type PageGraderSendItemResult = {
  space_item_id: string
  status: 'created' | 'skipped_already_sent' | 'failed'
  work_id?: string
  work_url?: string
  error?: string
}

export async function listPageGraderClients(q?: string): Promise<PageGraderClient[]> {
  const qs = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''
  const res = await backendGet<{ success: boolean; clients: PageGraderClient[] }>(
    `/api/integrations/page-grader/clients${qs}`,
  )
  return res?.clients ?? []
}

export async function sendSpaceItemsToPageGrader(input: {
  clientId: string
  spaceId: string
  spaceItemIds: string[]
  note?: string
}): Promise<{ success: boolean; results: PageGraderSendItemResult[] }> {
  const res = await backendPost<{ success: boolean; results: PageGraderSendItemResult[] }>(
    '/api/integrations/page-grader/send',
    {
      client_id: input.clientId,
      space_id: input.spaceId,
      space_item_ids: input.spaceItemIds,
      ...(input.note?.trim() ? { note: input.note.trim() } : {}),
    },
  )
  return {
    success: Boolean(res?.success),
    results: Array.isArray(res?.results) ? res.results : [],
  }
}
