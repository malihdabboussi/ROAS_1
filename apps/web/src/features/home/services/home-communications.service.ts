import { backendGet } from '@/lib/api/backend-client'

export type HomeRecentCommunicationKind = 'channel' | 'dm'

export interface HomeRecentCommunicationItem {
  kind: HomeRecentCommunicationKind
  message_id: string
  thread_id: string
  title: string
  preview: string
  sender_label: string | null
  occurred_at: string
  avatar_url: string | null
  channel_metadata: Record<string, unknown> | null
  partner_user_id: string | null
  unread: number
}

export async function fetchRecentCommunications(
  limit = 15,
): Promise<HomeRecentCommunicationItem[]> {
  const res = await backendGet<{ items: HomeRecentCommunicationItem[] }>(
    `/api/home/recent-communications?limit=${limit}`,
  )
  return res.items ?? []
}
