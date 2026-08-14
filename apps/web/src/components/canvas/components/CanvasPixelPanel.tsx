'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Viewport } from '@xyflow/react'
import { Sparkles, X } from 'lucide-react'
import { AgentChatPanel } from '@/features/team'
import { fetchMissionAgents, type MissionAgent } from '@/lib/agents'
import { CANVAS_VIEW_MESSAGES } from '../canvas-view.messages.config'

interface CanvasPixelPanelProps {
  boardId: string | null
  campaignId: string
  revision: number
  viewport: Viewport
  selectedIds: string[]
  composerSeed?: { text: string; nonce: string } | null
  onClose: () => void
}

export function CanvasPixelPanel({
  boardId,
  campaignId,
  revision,
  viewport,
  selectedIds,
  composerSeed,
  onClose,
}: CanvasPixelPanelProps) {
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
    return () => {
      active = false
    }
  }, [])

  const systemContext = useMemo(
    () =>
      [
        'The user is working inside the campaign Canvas.',
        `campaign_id=${campaignId}`,
        `board_id=${boardId ?? 'loading'}`,
        `board_revision=${revision}`,
        `canvas_viewport=${JSON.stringify(viewport)}`,
        `selected_canvas_item_ids=${selectedIds.join(',') || 'none'}`,
        'For Canvas requests, inspect campaign context with search_campaign_brain and the relevant list/get artifact actions before building. Ask only questions that block an accurate map.',
        'Use build_campaign_blueprint after the user confirms the plan. Derive campaign_label, stages, branches, and connections from this conversation and client evidence; these are not selectable templates. Use get_canvas_board immediately before any later apply_canvas_operations update.',
        'When the user asks for a campaign, funnel, webinar, launch, or customer-journey map, identify existing assets, supplied URLs, missing assets, and only the questions that block an accurate map.',
        'Represent confirmed assets as linked resource or URL cards and missing assets as clearly labeled placeholders. Never present an assumption as an existing asset.',
        'For a webinar build, use create_mission with playbook_id=webinar-fulfillment for the webinar deliverable when it is missing. Use canonical asset actions such as create_funnel, create_sequence, and create_ad for other confirmed gaps.',
        'After creating an asset from a placeholder, call complete_canvas_placeholder with the created resource type and ID so that exact node becomes a ready linked asset.',
        'Create normalized editable items and connectors; do not use create_strategy_node.',
      ].join('\n'),
    [boardId, campaignId, revision, selectedIds, viewport],
  )

  return (
    <aside className="surface-card border-border bottom-spacing-3 right-spacing-3 top-spacing-3 rounded-spacing-3 absolute z-30 flex w-96 flex-col overflow-hidden border shadow-xl">
      <header className="border-border gap-spacing-2 px-spacing-3 py-spacing-2 flex items-center border-b">
        <span className="badge-glass-purple rounded-spacing-2 flex h-8 w-8 items-center justify-center">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="body-2 text-foreground font-medium">Build with Pixel</p>
          <p className="body-4 text-muted-foreground">Creates editable objects on this Canvas</p>
        </div>
        <button
          type="button"
          className="button-ghost flex h-8 w-8 items-center justify-center"
          onClick={onClose}
          aria-label="Close Pixel Canvas chat"
        >
          <X className="h-4 w-4" />
        </button>
      </header>
      <div className="min-h-0 flex-1">
        {pixel ? (
          <AgentChatPanel
            agent={pixel}
            modelId="auto"
            initialCampaignId={campaignId}
            hideConversationsSidebar
            hideHeader
            hideCampaignPanel
            compactLayout
            startBlankSession
            systemContext={systemContext}
            composerSeed={composerSeed}
          />
        ) : (
          <div className="p-spacing-4 flex h-full items-center justify-center text-center">
            <p className="body-3 text-muted-foreground">
              {loadFailed
                ? CANVAS_VIEW_MESSAGES.pixelUnavailable
                : CANVAS_VIEW_MESSAGES.pixelLoading}
            </p>
          </div>
        )}
      </div>
    </aside>
  )
}
