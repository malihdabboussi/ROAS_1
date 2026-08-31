'use client'

import { useEffect, type MutableRefObject } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useReactFlow } from '@xyflow/react'
import { fetchCampaignWhiteboard } from '../services/whiteboard.service'
import type { CampaignWhiteboardResponse } from '../types/whiteboard.types'

interface UseCanvasOperationsRealtimeInput {
  boardId: string | null
  campaignId: string
  revisionRef: MutableRefObject<number>
  onRemoteBoard: (response: CampaignWhiteboardResponse) => void
}

export function useCanvasOperationsRealtime({
  boardId,
  campaignId,
  revisionRef,
  onRemoteBoard,
}: UseCanvasOperationsRealtimeInput): void {
  const { fitBounds } = useReactFlow()
  useEffect(() => {
    if (!boardId) return
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    let refreshTimer: ReturnType<typeof setTimeout> | null = null
    const channel = supabase
      .channel(`canvas:${boardId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'canvas_operations',
          filter: `board_id=eq.${boardId}`,
        },
        (payload) => {
          const inserted = payload.new as Record<string, unknown>
          const bounds = inserted.affected_bounds
          if (inserted.actor_agent_key && bounds && typeof bounds === 'object') {
            void fitBounds(bounds as { x: number; y: number; width: number; height: number }, {
              padding: 0.2,
              duration: 500,
            })
          }
          if (refreshTimer) clearTimeout(refreshTimer)
          refreshTimer = setTimeout(() => {
            void fetchCampaignWhiteboard(campaignId, boardId).then((response) => {
              if (response.board.revision <= revisionRef.current) return
              revisionRef.current = response.board.revision
              onRemoteBoard(response)
            })
          }, 250)
        },
      )
      .subscribe()
    return () => {
      if (refreshTimer) clearTimeout(refreshTimer)
      void supabase.removeChannel(channel)
    }
  }, [boardId, campaignId, fitBounds, onRemoteBoard, revisionRef])
}
