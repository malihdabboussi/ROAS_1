'use client'

import * as Popover from '@radix-ui/react-popover'
import { MoreHorizontal, ShieldCheck, Trash2 } from 'lucide-react'
import { Switch } from '@/components/ui/forms/switch'
import { formatSkillName } from '@/lib/agents/agent-display'
import type { MissionAgentSkill } from '@/lib/agents/agent-skill-types'
import { formatUpdatedAt, isOfficialSkill } from './skills-page.utils'

export function SkillCard({
  skill,
  toggleBusyId,
  menuOpenId,
  setMenuOpenId,
  onToggleEnabled,
  queueTrySkillMessage,
  downloadSkillMd,
  setDeleteTarget,
  setDetailResourceId,
  setDetailSkill,
  canViewOfficialSkillContent = false,
}: {
  skill: MissionAgentSkill
  toggleBusyId: string | null
  menuOpenId: string | null
  setMenuOpenId: (id: string | null) => void
  onToggleEnabled: (skill: MissionAgentSkill, enabled: boolean) => void | Promise<void>
  queueTrySkillMessage: (skill: MissionAgentSkill) => void
  downloadSkillMd: (skill: MissionAgentSkill) => void
  setDeleteTarget: (skill: MissionAgentSkill) => void
  setDetailResourceId: (id: string | null) => void
  setDetailSkill: (skill: MissionAgentSkill) => void
  canViewOfficialSkillContent?: boolean
}) {
  if (isOfficialSkill(skill)) {
    const openSkill = () => {
      if (!canViewOfficialSkillContent) return
      setDetailResourceId(null)
      setDetailSkill(skill)
    }
    return (
      <div
        key={skill.id}
        role={canViewOfficialSkillContent ? 'button' : undefined}
        tabIndex={canViewOfficialSkillContent ? 0 : undefined}
        onClick={openSkill}
        onKeyDown={(e) => {
          if (!canViewOfficialSkillContent) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            openSkill()
          }
        }}
        className={`card-glass border-border rounded-spacing-2 p-spacing-2 gap-spacing-2 flex h-full min-h-0 flex-col ${
          canViewOfficialSkillContent
            ? 'cursor-pointer transition-colors hover:bg-hover-subtle'
            : 'opacity-80'
        }`}
      >
        <div className="gap-spacing-2 flex shrink-0 items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="body-3 text-foreground font-semibold">{formatSkillName(skill.name)}</p>
          </div>
          <span className="badge-glass badge-glass-sm badge-glass-blue gap-spacing-1 flex shrink-0 items-center">
            <ShieldCheck className="icon-xs" />
            Official
          </span>
        </div>
        <div className="min-h-0 flex-1">
          <p className="body-4 text-muted-foreground line-clamp-2">{skill.description}</p>
        </div>
      </div>
    )
  }

  const busy = toggleBusyId === skill.id

  return (
    <div
      key={skill.id}
      role="button"
      tabIndex={0}
      onClick={() => {
        setDetailResourceId(null)
        setDetailSkill(skill)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setDetailResourceId(null)
          setDetailSkill(skill)
        }
      }}
      className="card-glass border-border rounded-spacing-2 p-spacing-2 gap-spacing-2 hover:bg-hover-subtle flex h-full min-h-0 cursor-pointer flex-col transition-colors"
    >
      <div
        className="gap-spacing-2 flex shrink-0 items-start justify-between"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="min-w-0 flex-1">
          <p className="body-3 text-foreground font-semibold">{formatSkillName(skill.name)}</p>
        </div>
        <Switch
          checked={skill.is_enabled}
          disabled={busy}
          onCheckedChange={(v) => void onToggleEnabled(skill, v)}
        />
      </div>
      <div className="min-h-0 flex-1">
        <p className="body-4 text-muted-foreground line-clamp-2">{skill.description}</p>
      </div>
      <div
        className="border-border gap-spacing-2 pt-spacing-2 flex shrink-0 items-center justify-between border-t"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <span className="body-4 text-muted-foreground">
          Updated {formatUpdatedAt(skill.updated_at)}
        </span>
        <Popover.Root
          open={menuOpenId === skill.id}
          onOpenChange={(open) => setMenuOpenId(open ? skill.id : null)}
        >
          <div className="gap-spacing-1 flex shrink-0 items-center">
            <Popover.Trigger asChild>
              <button
                type="button"
                className="btn-icon-glass btn-icon-glass-sm"
                aria-label="More"
                aria-expanded={menuOpenId === skill.id}
              >
                <MoreHorizontal className="icon-sm" />
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                side="bottom"
                align="end"
                sideOffset={4}
                collisionPadding={12}
                className="dropdown-menu-solid z-dropdown w-52 py-1 outline-none"
                onOpenAutoFocus={(e) => e.preventDefault()}
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="gap-spacing-2 px-spacing-3 py-spacing-2 body-3 hover:bg-hover-subtle text-foreground flex w-full items-center text-left transition-colors"
                  onClick={() => {
                    queueTrySkillMessage(skill)
                    setMenuOpenId(null)
                  }}
                >
                  Try it out
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="gap-spacing-2 px-spacing-3 py-spacing-2 body-3 hover:bg-hover-subtle text-foreground flex w-full items-center text-left transition-colors"
                  onClick={() => {
                    downloadSkillMd(skill)
                    setMenuOpenId(null)
                  }}
                >
                  Download
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="gap-spacing-2 px-spacing-3 py-spacing-2 hover:bg-hover-subtle body-3 text-destructive flex w-full items-center text-left transition-colors"
                  onClick={() => {
                    setDeleteTarget(skill)
                    setMenuOpenId(null)
                  }}
                >
                  <Trash2 className="icon-sm shrink-0" />
                  Delete
                </button>
              </Popover.Content>
            </Popover.Portal>
          </div>
        </Popover.Root>
      </div>
    </div>
  )
}
