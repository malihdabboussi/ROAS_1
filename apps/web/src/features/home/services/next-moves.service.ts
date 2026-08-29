'use client'

import { backendGet, backendPost } from '@/lib/api/backend-client'

export type SuggestedNextMove = {
  id: string
  title: string
  prompt: string
  source: {
    type: 'meeting' | 'slack' | 'task'
    title: string
    occurredAt: string
    url: string
    sourceKind: string | null
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

export function recordNextMoveFeedback(id: string, feedback: 'accepted' | 'false_positive') {
  return backendPost<{ success: true }>(`/api/home/next-moves/${encodeURIComponent(id)}/feedback`, {
    feedback,
  })
}
