'use client'

import { useRef, useState } from 'react'
import { ExternalLink, Rocket } from 'lucide-react'
import { toast } from 'sonner'
import {
  SPACES_CELL_TOAST_ERRORS,
  SPACES_CELL_TOAST_SUCCESS,
} from '@/lib/config/spaces-toast-errors.config'
import type { FieldDef, SpaceItem } from '@/lib/spaces'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import { MissionSendDropdown, type MissionSendOptions } from './MissionSendDropdown'

type MissionCellProps = {
  field: FieldDef
  spaceItem: SpaceItem
  onPushToAgent: (itemId: string, options?: MissionSendOptions) => Promise<void>
  allFields: FieldDef[]
  roster: TeamRosterEntry[]
  fieldRowVariant?: 'default' | 'kanban'
  openOnMount?: boolean
  bulkInlineEditor?: boolean
}

export function MissionCell({
  field: _field,
  spaceItem,
  onPushToAgent,
  allFields,
  roster,
  fieldRowVariant = 'default',
  openOnMount,
  bulkInlineEditor: _bulkInlineEditor,
}: MissionCellProps) {
  const [dropdownOpen, setDropdownOpen] = useState(!!openOnMount)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const linked = spaceItem.linked_mission_id
  const showRocket = !linked && spaceItem.assignee_type === 'agent'

  async function handleSend(options: MissionSendOptions) {
    try {
      await onPushToAgent(spaceItem.id, options)
      toast.success(SPACES_CELL_TOAST_SUCCESS.MISSION_CREATED.userMessage)
      setDropdownOpen(false)
    } catch {
      toast.error(SPACES_CELL_TOAST_ERRORS.PUSH_TO_AGENT_FAILED.userMessage)
    }
  }

  if (fieldRowVariant === 'kanban') {
    if (linked) {
      return (
        <a
          href={`/home?mission=${linked}`}
          title="Open mission"
          onPointerDown={(e) => e.stopPropagation()}
          className="inline-flex text-violet-400 hover:text-violet-300"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )
    }
    if (showRocket) {
      return (
        <>
          <button
            ref={triggerRef}
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              setDropdownOpen(true)
            }}
            title="Send to agent"
            className="inline-flex text-[var(--color-muted-foreground)] hover:text-violet-300"
          >
            <Rocket className="h-3.5 w-3.5" />
          </button>
          {dropdownOpen && (
            <MissionSendDropdown
              spaceItem={spaceItem}
              allFields={allFields}
              roster={roster}
              onSend={handleSend}
              onClose={() => setDropdownOpen(false)}
              triggerRef={triggerRef}
            />
          )}
        </>
      )
    }
    return <span className="text-sm text-[var(--color-muted-foreground)]">—</span>
  }

  return (
    <div className="flex items-center justify-center py-1">
      {linked ? (
        <a
          href={`/home?mission=${linked}`}
          title="Open mission"
          onPointerDown={(e) => e.stopPropagation()}
          className="text-violet-400 hover:text-violet-300"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : showRocket ? (
        <>
          <button
            ref={triggerRef}
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              setDropdownOpen(true)
            }}
            title="Send to agent"
            className="text-[var(--color-muted-foreground)] opacity-0 transition-opacity hover:text-violet-300 group-hover/row:opacity-100 group-hover:opacity-100"
          >
            <Rocket className="h-3.5 w-3.5" />
          </button>
          {dropdownOpen && (
            <MissionSendDropdown
              spaceItem={spaceItem}
              allFields={allFields}
              roster={roster}
              onSend={handleSend}
              onClose={() => setDropdownOpen(false)}
              triggerRef={triggerRef}
            />
          )}
        </>
      ) : (
        <span className="text-[var(--color-muted-foreground)]">—</span>
      )}
    </div>
  )
}
