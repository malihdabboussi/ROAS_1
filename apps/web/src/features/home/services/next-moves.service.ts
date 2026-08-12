'use client'

import { backendGet, backendPost } from '@/lib/api/backend-client'

export type SuggestedNextMove = {
  id: string
  title: string
  prompt: string
  source: {
    type: 'meeting'
    title: string
    occurredAt: string
    spaceId: string
    meetingItemId: string
  }
}

export function fetchNextMoves(): Promise<{ suggestions: SuggestedNextMove[] }> {
  return backendGet('/api/home/next-moves')
}

export function snoozeNextMove(id: string, duration: 'week' | 'dismiss') {
  return backendPost<{ success: true }>(`/api/home/next-moves/${encodeURIComponent(id)}/snooze`, {
    duration,
  })
}
