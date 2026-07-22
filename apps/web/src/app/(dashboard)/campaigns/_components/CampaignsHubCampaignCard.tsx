'use client'

import {
  ChevronRight,
  FolderInput,
  LayoutDashboard,
  MoreHorizontal,
  Plus,
  Share2,
  Trash2,
} from 'lucide-react'
import { getIconColor, LucideIcon } from '@/components/ui/IconPicker'
import type { Space } from '@/features/spaces/types'
import type { Campaign } from '@/lib/campaigns'
import type { Program } from '@/lib/programs'
import { cn } from '@/lib/utils/cn'

function campaignIconName(campaign: Campaign): string {
  return ((campaign.config as Record<string, unknown>)?.icon as string) ?? 'folder-kanban'
}

function isGeneralCampaign(campaign: Campaign): boolean {
  return (campaign.config as Record<string, unknown>)?.system_kind === 'general'
}

function spaceIconName(space: Space): string {
  return typeof space.schema?.icon === 'string' && space.schema.icon.length > 0
    ? space.schema.icon
    : 'layout-grid'
}

export function CampaignsHubCampaignCard({
  campaign,
  spaces,
  expanded,
  menuOpen,
  creatingSpace,
  showShare,
  programs = [],
  onToggleExpanded,
  onOpenOverview,
  onOpenWork,
  onCreateSpace,
  onOpenSpace,
  onMenuOpenChange,
  onShare,
  onDelete,
  onMoveToProgram,
}: {
  campaign: Campaign
  spaces: Space[]
  expanded: boolean
  menuOpen: boolean
  creatingSpace: boolean
  showShare: boolean
  programs?: Program[]
  onToggleExpanded: () => void
  onOpenOverview: () => void
  onOpenWork: () => void
  onCreateSpace: () => void
  onOpenSpace: (spaceId: string) => void
  onMenuOpenChange: (open: boolean) => void
  onShare: () => void
  onDelete: () => void
  onMoveToProgram?: (programId: string | null) => void
}) {
  const icon = campaignIconName(campaign)
  const iconColor = getIconColor(
    (campaign.config as Record<string, unknown>)?.icon_color as string | undefined,
  ).textColor
  const general = isGeneralCampaign(campaign)
  const moveTargets = programs.filter((p) => p.id !== campaign.program_id)

  return (
    <li className="surface-card border-border rounded-spacing-3 overflow-hidden border">
      <div className="gap-spacing-2 px-spacing-3 py-spacing-3 flex items-center">
        <button
          type="button"
          onClick={onToggleExpanded}
          className="text-muted-foreground hover:text-foreground hover:bg-hover-subtle flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse spaces' : 'Expand spaces'}
        >
          <ChevronRight
            className={cn('h-4 w-4 transition-transform duration-150', expanded && 'rotate-90')}
          />
        </button>
        <button
          type="button"
          onClick={onOpenOverview}
          className="gap-spacing-2 flex min-w-0 flex-1 items-center text-left"
        >
          <span className="bg-secondary flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
            <LucideIcon name={icon} className={cn('h-4 w-4', iconColor)} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="body-2 text-foreground block truncate font-medium">
              {campaign.name ?? 'Untitled campaign'}
            </span>
            <span className="body-4 text-muted-foreground">
              {spaces.length === 0
                ? 'No spaces'
                : `${spaces.length} space${spaces.length === 1 ? '' : 's'}`}
              {general ? ' · General' : ''}
            </span>
          </span>
        </button>
        <div className="gap-spacing-1 hidden items-center sm:flex">
          <button
            type="button"
            onClick={onOpenOverview}
            className="button-glass-neutral body-4 rounded-lg px-2.5 py-1.5 font-medium"
          >
            Overview
          </button>
          <button
            type="button"
            onClick={onOpenWork}
            className="button-glass-accent body-4 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-medium"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            Work
          </button>
          <button
            type="button"
            onClick={onCreateSpace}
            disabled={creatingSpace}
            className="chip-glass-neutral body-4 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            {creatingSpace ? 'Creating…' : 'Space'}
          </button>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => onMenuOpenChange(!menuOpen)}
            className="btn-icon-glass"
            aria-label="Campaign options"
          >
            <MoreHorizontal className="icon-sm" />
          </button>
          {menuOpen ? (
            <>
              <div
                className="z-dropdown fixed inset-0"
                onClick={() => onMenuOpenChange(false)}
                aria-hidden
              />
              <div className="border-border bg-card z-dropdown absolute right-0 top-full mt-1 w-52 overflow-hidden rounded-lg border p-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    onMenuOpenChange(false)
                    onOpenOverview()
                  }}
                  className="body-3 text-foreground hover:bg-hover-subtle flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left"
                >
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onMenuOpenChange(false)
                    onOpenWork()
                  }}
                  className="body-3 text-foreground hover:bg-hover-subtle flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left"
                >
                  Work board
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onMenuOpenChange(false)
                    onCreateSpace()
                  }}
                  className="body-3 text-foreground hover:bg-hover-subtle flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left sm:hidden"
                >
                  New space
                </button>
                {showShare ? (
                  <button
                    type="button"
                    onClick={() => {
                      onMenuOpenChange(false)
                      onShare()
                    }}
                    className="body-3 text-foreground hover:bg-hover-subtle flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left"
                  >
                    <Share2 className="h-4 w-4" />
                    Sharing
                  </button>
                ) : null}
                {onMoveToProgram && moveTargets.length > 0 ? (
                  <>
                    <p className="body-4 text-muted-foreground px-3 pb-1 pt-2">Move to program</p>
                    {moveTargets.map((program) => (
                      <button
                        key={program.id}
                        type="button"
                        onClick={() => {
                          onMenuOpenChange(false)
                          onMoveToProgram(program.id)
                        }}
                        className="body-3 text-foreground hover:bg-hover-subtle flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left"
                      >
                        <FolderInput className="h-4 w-4" />
                        {program.name}
                      </button>
                    ))}
                    {campaign.program_id ? (
                      <button
                        type="button"
                        onClick={() => {
                          onMenuOpenChange(false)
                          onMoveToProgram(null)
                        }}
                        className="body-3 text-foreground hover:bg-hover-subtle flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left"
                      >
                        <FolderInput className="h-4 w-4" />
                        Ungrouped
                      </button>
                    ) : null}
                  </>
                ) : null}
                {!general ? (
                  <button
                    type="button"
                    onClick={() => {
                      onMenuOpenChange(false)
                      onDelete()
                    }}
                    className="body-3 text-destructive hover:bg-destructive/10 flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {expanded ? (
        <div className="border-border px-spacing-3 py-spacing-2 border-t">
          {spaces.length === 0 ? (
            <div className="px-spacing-2 py-spacing-3">
              <p className="body-3 text-muted-foreground">
                No spaces yet. Add one for tasks, docs, and day-to-day work.
              </p>
              <button
                type="button"
                onClick={onCreateSpace}
                disabled={creatingSpace}
                className="button-glass-primary body-3 mt-spacing-2 inline-flex items-center gap-2 rounded-lg px-3 py-2 font-medium disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {creatingSpace ? 'Creating…' : 'Create space'}
              </button>
            </div>
          ) : (
            <ul className="space-y-0.5">
              {spaces.map((space) => (
                <li key={space.id}>
                  <button
                    type="button"
                    onClick={() => onOpenSpace(space.id)}
                    className="hover:bg-hover-subtle body-3 text-foreground flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left"
                  >
                    <LucideIcon
                      name={spaceIconName(space)}
                      className={cn(
                        'h-4 w-4 shrink-0',
                        getIconColor(space.schema?.icon_color).textColor,
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate">{space.title}</span>
                    <ChevronRight className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </li>
  )
}

export { isGeneralCampaign, spaceIconName }
