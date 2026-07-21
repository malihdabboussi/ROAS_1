'use client'

import type { KeyboardEvent, ReactNode } from 'react'
import { Bot, Brain, Building2, Plus, Share2, Users } from 'lucide-react'
import type { BrainScopeMenuContext } from '@/features/brain/hooks/use-brain-scope-menu-actions'
import type { BrainScopeNavOption } from '@/features/brain/hooks/use-brain-scope-nav-options'
import type { BrainHealthData } from '@/features/brain/types'
import type { MissionAgent } from '@/lib/agents'
import { spaceGroupBadgeChipProps } from '@/lib/ui/group-badge-glass'
import { brainCardStatus, brainCardStatusLabel, statusDotClass } from './BrainHomeGridCard'
import { CampaignBrainIconDisplay } from './CampaignBrainIconPicker'

export type BrainListSection = {
  id: string
  title: string
  color: string
  items: BrainScopeNavOption[]
  addAgentBrain?: {
    agents: MissionAgent[]
    count: number
  }
}

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

function scopeTypeLabel(scopeType: BrainScopeNavOption['scopeType']): string {
  switch (scopeType) {
    case 'user':
      return 'User'
    case 'person':
      return 'Person'
    case 'shared':
      return 'Shared'
    case 'company':
      return 'Company'
    case 'customer':
      return 'Customer'
    case 'agent':
      return 'Agent'
    case 'campaign':
    case 'campaign_knowledge':
      return 'Campaign'
  }
}

function listAvatarFallback(scopeType: BrainScopeNavOption['scopeType'], label: string): ReactNode {
  const iconCls = 'h-3.5 w-3.5 text-muted-foreground'
  switch (scopeType) {
    case 'user':
    case 'person':
    case 'shared':
      return (
        <span className="typo-caption text-muted-foreground font-semibold">
          {label.slice(0, 1).toUpperCase()}
        </span>
      )
    case 'company':
      return <Building2 className={iconCls} />
    case 'customer':
      return <Users className={iconCls} />
    case 'agent':
      return <Bot className={iconCls} />
    case 'campaign':
    case 'campaign_knowledge':
      return <Brain className={iconCls} />
  }
}

function BrainListSectionHeader({ section }: { section: BrainListSection }) {
  const chip = spaceGroupBadgeChipProps(section.color)
  const count = section.items.length + (section.addAgentBrain ? 1 : 0)
  return (
    <div className="border-border bg-background sticky top-0 z-[1] flex items-center gap-2 border-b px-3 py-2">
      <span
        className={`rounded-spacing-2 inline-flex items-center px-2.5 py-0.5 text-xs font-normal uppercase tracking-wider ${chip.chipClassName}`}
        style={chip.style}
      >
        {section.title}
      </span>
      <span className="text-muted-foreground text-xs">{count}</span>
    </div>
  )
}

function BrainListAddAgentRow({ count, onClick }: { count: number; onClick: () => void }) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onClick()
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className="gap-spacing-3 border-border body-4 text-foreground hover:bg-hover-subtle px-spacing-3 py-spacing-2 grid w-full grid-cols-[1.35fr_0.75fr_0.85fr_0.75fr_0.8fr] items-center border-b border-dashed text-left transition-colors last:border-b-0"
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="border-subtle flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed">
          <Plus className="text-muted-foreground h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <span className="body-4 font-medium">Add agent brain</span>
          <p className="body-4 text-muted-foreground truncate">
            {count} agent{count === 1 ? '' : 's'} ready
          </p>
        </div>
      </div>
      <div className="body-4 text-muted-foreground">Agent</div>
      <div className="text-muted-foreground">—</div>
      <div className="text-muted-foreground">—</div>
      <div className="text-muted-foreground">—</div>
    </div>
  )
}

function BrainListRow({
  option,
  health,
  loading,
  imageUrl,
  menuContext,
}: {
  option: BrainScopeNavOption
  health: BrainHealthData | undefined
  loading: boolean
  imageUrl?: string | null
  menuContext: BrainScopeMenuContext
}) {
  const status = brainCardStatus(health, loading)
  const isKnowledgeScope = option.scopeType === 'campaign_knowledge'
  const memoryCount = health?.total_memories ?? 0
  const lastCapture = health?.last_capture ?? null

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    menuContext.onOpenBrain()
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => menuContext.onOpenBrain()}
      onKeyDown={handleKeyDown}
      className="gap-spacing-3 border-border body-4 text-foreground hover:bg-hover-subtle px-spacing-3 py-spacing-2 grid w-full grid-cols-[1.35fr_0.75fr_0.85fr_0.75fr_0.8fr] items-center border-b text-left transition-colors last:border-b-0"
    >
      <div className="flex min-w-0 items-center gap-2">
        {option.scopeType === 'campaign_knowledge' && option.campaignId ? (
          <CampaignBrainIconDisplay
            variant="inline"
            icon={option.campaignIcon ?? 'brain'}
            iconColor={option.campaignIconColor ?? 'purple'}
            imageUrl={imageUrl ?? null}
          />
        ) : imageUrl ? (
          <img src={imageUrl} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="bg-muted flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
            {option.scopeType === 'shared' ? (
              <Share2 className="text-muted-foreground h-3.5 w-3.5" />
            ) : (
              listAvatarFallback(option.scopeType, option.label)
            )}
          </span>
        )}
        <span className="body-4 truncate font-medium">{option.label}</span>
      </div>
      <div className="body-4 text-muted-foreground min-w-0 truncate">
        {scopeTypeLabel(option.scopeType)}
      </div>
      <div className="flex items-center gap-1.5">
        {loading ? (
          <span className="text-muted-foreground">Loading</span>
        ) : (
          <>
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass(status)}`}
              aria-hidden
            />
            <span className="text-muted-foreground">{brainCardStatusLabel(status)}</span>
          </>
        )}
      </div>
      <div className="text-muted-foreground tabular-nums">
        {loading ? '—' : memoryCount.toLocaleString()}
        <span className="body-4 ml-1">{isKnowledgeScope ? 'objects' : 'memories'}</span>
      </div>
      <div className="text-muted-foreground">{loading ? '—' : relativeTime(lastCapture)}</div>
    </div>
  )
}

export function BrainHomeListView({
  sections,
  healthLoading,
  resolveHealth,
  getMenuContext,
  onAddAgentBrain,
}: {
  sections: BrainListSection[]
  healthLoading: boolean
  resolveHealth: (option: BrainScopeNavOption) => BrainHealthData | undefined
  getMenuContext: (option: BrainScopeNavOption) => BrainScopeMenuContext
  onAddAgentBrain: () => void
}) {
  const totalItems = sections.reduce(
    (sum, section) => sum + section.items.length + (section.addAgentBrain ? 1 : 0),
    0,
  )

  const rows = sections.flatMap((section) => [
    <BrainListSectionHeader key={`header-${section.id}`} section={section} />,
    ...(section.addAgentBrain
      ? [
          <BrainListAddAgentRow
            key={`add-agent-${section.id}`}
            count={section.addAgentBrain.count}
            onClick={onAddAgentBrain}
          />,
        ]
      : []),
    ...section.items.map((option) => (
      <BrainListRow
        key={option.id}
        option={option}
        health={resolveHealth(option)}
        loading={healthLoading}
        imageUrl={option.imageUrl ?? null}
        menuContext={getMenuContext(option)}
      />
    )),
  ])

  return (
    <div className="surface-card border-subtle rounded-spacing-3 flex min-h-0 flex-1 flex-col overflow-hidden border">
      <div className="gap-spacing-3 border-border body-4 text-muted-foreground px-spacing-3 py-spacing-2 grid shrink-0 grid-cols-[1.35fr_0.75fr_0.85fr_0.75fr_0.8fr] border-b font-medium uppercase tracking-wide">
        <div>Name</div>
        <div>Type</div>
        <div>Status</div>
        <div>Memories</div>
        <div>Last active</div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {totalItems === 0 ? (
          <div className="body-3 text-muted-foreground p-spacing-4 text-center">
            No brains match the current filters.
          </div>
        ) : (
          rows
        )}
      </div>
    </div>
  )
}
