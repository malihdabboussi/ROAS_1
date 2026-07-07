'use client'

import Link from 'next/link'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { getIconColor, IconPicker, LucideIcon } from '@/components/ui/IconPicker'
import type { AgentTeam } from '@/lib/agents'

interface TeamDetailHeaderProps {
  team: AgentTeam | null
  canEditTeam: boolean
  renaming: boolean
  renameDraft: string
  onRenameDraftChange: (value: string) => void
  onStartRename: () => void
  onCancelRename: () => void
  onSubmitRename: () => void
  onSetIcon: (icon: string) => void
  onSetColor: (color: string) => void
  onDelete: () => void
}

export function TeamDetailHeader({
  team,
  canEditTeam,
  renaming,
  renameDraft,
  onRenameDraftChange,
  onStartRename,
  onCancelRename,
  onSubmitRename,
  onSetIcon,
  onSetColor,
  onDelete,
}: TeamDetailHeaderProps) {
  const palette = getIconColor(team?.color ?? 'muted')

  return (
    <div className="gap-spacing-3 px-spacing-4 py-spacing-3 flex shrink-0 items-center">
      <Link
        href="/team/teams"
        className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded-spacing-2 p-spacing-1 transition-colors"
        aria-label="Back to teams"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>
      {team ? (
        <IconPicker
          value={team.icon || 'users'}
          onChange={onSetIcon}
          color={team.color}
          onColorChange={onSetColor}
          size="sm"
          disabled={!canEditTeam}
          customTrigger={
            <span
              className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${palette.glassClass} hover:opacity-80`}
              aria-label="Change team icon and color"
            >
              <LucideIcon
                name={team.icon || 'users'}
                className={`h-3.5 w-3.5 ${palette.textColor}`}
              />
            </span>
          }
        />
      ) : (
        <span
          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${palette.glassClass}`}
        >
          <LucideIcon name="users" className={`h-3.5 w-3.5 ${palette.textColor}`} />
        </span>
      )}
      {renaming ? (
        <input
          autoFocus
          value={renameDraft}
          onChange={(e) => onRenameDraftChange(e.target.value)}
          onBlur={onSubmitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmitRename()
            if (e.key === 'Escape') onCancelRename()
          }}
          className="title-h5 text-foreground min-w-0 flex-1 bg-transparent outline-none"
        />
      ) : team?.is_system ? (
        <span className="title-h5 text-foreground min-w-0 flex-1 truncate" title={team.name}>
          {team.name}
        </span>
      ) : (
        <button
          type="button"
          className="title-h5 text-foreground hover:text-foreground/80 min-w-0 flex-1 truncate text-left"
          onClick={onStartRename}
          disabled={!team}
        >
          {team?.name ?? 'Loading...'}
        </button>
      )}
      {team && !team.is_system && canEditTeam ? (
        <button
          type="button"
          onClick={onDelete}
          className="text-muted-foreground hover:bg-hover-subtle hover:text-destructive rounded-spacing-2 p-spacing-1 transition-colors"
          aria-label="Delete team"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}
