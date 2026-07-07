import type { Channel } from './channels-api'

export const PENDING_CHANNEL_ADD_PEOPLE_KEY = 'vibey-pending-channel-add-people'

export function stashPendingChannelAddPeople(channel: Channel): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(PENDING_CHANNEL_ADD_PEOPLE_KEY, JSON.stringify(channel))
}

/** Read and clear pending channel for add-people flow when landing on the channel page. */
export function consumePendingChannelAddPeople(expectedChannelId: string): Channel | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(PENDING_CHANNEL_ADD_PEOPLE_KEY)
  if (!raw) return null
  sessionStorage.removeItem(PENDING_CHANNEL_ADD_PEOPLE_KEY)
  try {
    const ch = JSON.parse(raw) as Channel
    return ch.id === expectedChannelId ? ch : null
  } catch {
    return null
  }
}
