'use client'

import { useEffect, useMemo, useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import type { Viewport } from '@xyflow/react'
import { AgentChatPanel } from '@/features/team'
import { fetchMissionAgents, type MissionAgent } from '@/lib/agents'
import { CANVAS_VIEW_MESSAGES } from '../canvas-view.messages.config'

interface CanvasPixelPanelProps {
  boardId: string | null
  campaignId: string
  revision: number
  viewport: Viewport
  selectedIds: string[]
  onClose: () => void
}

export function CanvasPixelPanel({ boardId, campaignId, revision, viewport, selectedIds, onClose }: CanvasPixelPanelProps) {
  const [pixel, setPixel] = useState<MissionAgent | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    let active = true
    void fetchMissionAgents()
      .then((agents) => {
        if (!active) return
        const match =
          agents.find((agent) => agent.agent_key.toLowerCase() === 'pixel') ??
          agents.find((agent) => agent.agent_key.toLowerCase() === 'vibey') ??
          agents.find((agent) => agent.name.toLowerCase() === 'pixel') ??
          null
        setPixel(match)
        setLoadFailed(match === null)
      })
      .catch(() => active && setLoadFailed(true))
    return () => { active = false }
  }, [])

  const systemContext = useMemo(() => [
    'The user is working inside the campaign Canvas.',
    `campaign_id=${campaignId}`,
    `board_id=${boardId ?? 'loading'}`,
    `board_revision=${revision}`,
    `canvas_viewport=${JSON.stringify(viewport)}`,
    `selected_canvas_item_ids=${selectedIds.join(',') || 'none'}`,
    'For Canvas requests, call get_canvas_board immediately before apply_canvas_operations.',
    'Create normalized editable items and connectors; do not use create_strategy_node.',
  ].join('\n'), [boardId, campaignId, revision, selectedIds, viewport])

  return (
    <aside className="surface-card border-border absolute bottom-spacing-3 right-spacing-3 top-spacing-3 z-30 flex w-96 flex-col overflow-hidden rounded-spacing-3 border shadow-xl">
      <header className="border-border flex items-center gap-spacing-2 border-b px-spacing-3 py-spacing-2">
        <span className="badge-glass-purple flex h-8 w-8 items-center justify-center rounded-spacing-2"><Sparkles className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="body-2 text-foreground font-medium">Build with Pixel</p>
          <p className="body-4 text-muted-foreground">Creates editable objects on this Canvas</p>
        </div>
        <button type="button" className="button-ghost flex h-8 w-8 items-center justify-center" onClick={onClose} aria-label="Close Pixel Canvas chat"><X className="h-4 w-4" /></button>
      </header>
      <div className="min-h-0 flex-1">
        {pixel ? (
          <AgentChatPanel agent={pixel} modelId="auto" initialCampaignId={campaignId} hideConversationsSidebar hideHeader hideCampaignPanel compactLayout startBlankSession systemContext={systemContext} />
        ) : (
          <div className="flex h-full items-center justify-center p-spacing-4 text-center">
            <p className="body-3 text-muted-foreground">{loadFailed ? CANVAS_VIEW_MESSAGES.pixelUnavailable : CANVAS_VIEW_MESSAGES.pixelLoading}</p>
          </div>
        )}
      </div>
    </aside>
  )
}
