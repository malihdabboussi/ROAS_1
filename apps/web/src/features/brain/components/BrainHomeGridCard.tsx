'use client'

import { useState, type ReactNode } from 'react'
import {
  Bot,
  Brain,
  Building2,
  GraduationCap,
  MoreHorizontal,
  Share2,
  Users,
} from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import type { BrainScopeMenuContext } from '@/features/brain/hooks/use-brain-scope-menu-actions'
import type { BrainScopeNavOption } from '@/features/brain/hooks/use-brain-scope-nav-options'
import type { BrainHealthData } from '@/features/brain/types'
import { CampaignBrainIconDisplay } from './CampaignBrainIconPicker'
import { BRAIN_CARD_MENU_WIDTH, BrainHomeGridCardMenu } from './BrainHomeGridCardMenu'
import { CortexMaxIcon } from './CortexMaxIcon'

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  return `${weeks}w ago`
}

function scopeHeroFallback(scopeType: BrainScopeNavOption['scopeType'], label: string): ReactNode {
  const iconCls = 'h-14 w-14 text-muted-foreground'
  switch (scopeType) {
    case 'user':
      return (
        <span className="title-h4 text-muted-foreground">{label.slice(0, 1).toUpperCase()}</span>
      )
    case 'shared':
      return <Share2 className={iconCls} />
    case 'company':
      return <Building2 className={iconCls} />
    case 'customer':
      return <Users className={iconCls} />
    case 'agent':
      return <Bot className={iconCls} />
    case 'campaign':
      return <Brain className={iconCls} />
    case 'campaign_knowledge':
      return <Brain className={iconCls} />
  }
}

export type BrainCardStatus = 'loading' | 'training' | 'empty' | 'recent' | 'quiet' | 'dormant'

export function brainCardStatus(
  health: BrainHealthData | undefined,
  loading: boolean,
): BrainCardStatus {
  if (loading) return 'loading'
  const queue = health?.embedding_queue ?? 0
  const lastCapture = health?.last_capture ?? null
  if (queue > 0) return 'training'
  if (!lastCapture) return 'empty'
  const ageH = (Date.now() - new Date(lastCapture).getTime()) / 3_600_000
  if (ageH < 24 * 7) return 'recent'
  if (ageH < 24 * 30) return 'quiet'
  return 'dormant'
}

export function brainCardStatusLabel(status: BrainCardStatus): string {
  switch (status) {
    case 'recent':
      return 'Recent'
    case 'quiet':
      return 'Quiet'
    case 'dormant':
      return 'Dormant'
    case 'training':
      return 'Training'
    case 'empty':
      return 'Never trained'
    case 'loading':
      return 'Loading'
  }
}

function brainCardStatusTooltip(status: BrainCardStatus): string {
  switch (status) {
    case 'recent':
      return 'Recent — Last capture within 7 days'
    case 'quiet':
      return 'Quiet — Last capture 7–30 days ago'
    case 'dormant':
      return 'Dormant — No capture in 30+ days'
    case 'training':
      return 'Training — Embedding queue in progress'
    case 'empty':
      return 'Never trained — No captures yet'
    case 'loading':
      return 'Loading'
  }
}

export function statusDotClass(status: BrainCardStatus): string {
  switch (status) {
    case 'recent':
      return 'bg-success'
    case 'training':
      return 'bg-primary'
    case 'quiet':
      return 'bg-warning'
    case 'dormant':
      return 'bg-muted-foreground'
    case 'empty':
      return 'bg-muted-foreground'
    case 'loading':
      return 'bg-muted-foreground/50'
  }
}

export function BrainHomeGridCard({
  option,
  health,
  loading,
  imageUrl,
  menuContext,
  canTrain,
  onTrain,
  onCortexMax,
}: {
  option: BrainScopeNavOption
  health: BrainHealthData | undefined
  loading: boolean
  imageUrl?: string | null
  menuContext: BrainScopeMenuContext
  canTrain?: boolean
  onTrain?: () => void
  onCortexMax?: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(null)

  const status = brainCardStatus(health, loading)
  const isKnowledgeScope = option.scopeType === 'campaign_knowledge'
  const objectCount = health?.total_memories ?? 0
  const connectionCount = health?.total_connections ?? 0
  const lastCapture = health?.last_capture ?? null
  const openMenuAt = (clientX: number, clientY: number) => {
    setMenuAnchor({ x: clientX, y: clientY })
    setMenuOpen(true)
  }

  const openMenuFromButton = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    openMenuAt(rect.right - BRAIN_CARD_MENU_WIDTH, rect.bottom + 4)
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => menuContext.onOpenBrain()}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          openMenuAt(e.clientX, e.clientY)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            menuContext.onOpenBrain()
          }
        }}
        className="border-subtle group/brain-card rounded-spacing-3 relative flex cursor-pointer flex-col overflow-visible text-left transition-opacity hover:opacity-95"
      >
        <div className="bg-muted rounded-t-spacing-3 relative aspect-square w-full overflow-visible">
          <div className="rounded-t-spacing-3 absolute inset-0 overflow-hidden">
            {option.scopeType === 'campaign_knowledge' && option.campaignId ? (
              <CampaignBrainIconDisplay
                variant="card"
                className="h-full w-full"
                icon={option.campaignIcon ?? 'brain'}
                iconColor={option.campaignIconColor ?? 'purple'}
                imageUrl={imageUrl ?? null}
              />
            ) : imageUrl ? (
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="bg-muted flex h-full w-full items-center justify-center">
                {scopeHeroFallback(option.scopeType, option.label)}
              </div>
            )}
          </div>
          {loading ? null : (
            <Tooltip
              label={brainCardStatusTooltip(status)}
              side="bottom"
              delayMs={120}
              triggerClassName="absolute left-2 top-2 z-10"
            >
              <span
                className={`block h-2.5 w-2.5 rounded-full ${statusDotClass(status)}`}
                aria-label={brainCardStatusLabel(status)}
              />
            </Tooltip>
          )}
          <div
            className="pointer-events-none absolute right-2 top-2 z-10 opacity-0 transition-opacity duration-200 ease-out group-hover/brain-card:pointer-events-auto group-hover/brain-card:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="surface-card border-subtle flex flex-col items-center gap-0.5 rounded-lg border p-0.5 shadow-sm">
              {canTrain && onTrain ? (
                <button
                  type="button"
                  title="Train"
                  className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex h-7 w-7 items-center justify-center rounded-md transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    onTrain()
                  }}
                >
                  <GraduationCap className="icon-sm" />
                </button>
              ) : null}
              {canTrain && onCortexMax ? (
                <button
                  type="button"
                  title="Cortex MAX"
                  className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex h-7 w-7 items-center justify-center rounded-md transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCortexMax()
                  }}
                >
                  <CortexMaxIcon size="sm" className="icon-sm" />
                </button>
              ) : null}
              <button
                type="button"
                title="More"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                className={`text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                  menuOpen ? 'bg-hover-subtle text-foreground' : ''
                }`}
                onClick={openMenuFromButton}
              >
                <MoreHorizontal className="icon-sm" />
              </button>
            </div>
          </div>
        </div>

        <div className="gap-spacing-1 rounded-b-spacing-3 p-spacing-2 flex min-h-0 flex-1 flex-col">
          <div className="gap-spacing-1 flex min-w-0 items-center justify-between">
            <span className="body-2 text-foreground min-w-0 flex-1 truncate font-medium">
              {option.label}
            </span>
            {loading ? null : status === 'training' ? (
              <span className="body-4 text-foreground shrink-0">Training</span>
            ) : lastCapture ? (
              <span className="body-4 text-muted-foreground shrink-0">
                {relativeTime(lastCapture)}
              </span>
            ) : null}
          </div>
          {loading ? null : (
            <div className="body-4 text-muted-foreground flex flex-col">
              <span>
                {isKnowledgeScope ? 'Objects' : 'Memories'}: {objectCount.toLocaleString()}
              </span>
              <span>Connections: {connectionCount.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {menuOpen ? (
        <BrainHomeGridCardMenu
          position={menuAnchor}
          ctx={menuContext}
          option={option}
          imageUrl={imageUrl}
          onClose={() => setMenuOpen(false)}
        />
      ) : null}
    </>
  )
}
