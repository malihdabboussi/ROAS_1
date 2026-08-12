'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight, FolderInput, Globe, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Tooltip } from '@/components/ui/tooltip'
import { HOME_TOAST_ERRORS } from '@/features/home/config/home-toast-errors.config'
import {
  transferMeetingActionToSpace,
  type MeetingAction,
} from '@/features/home/services/meeting-workspace-api'
import { fetchCampaigns, type Campaign } from '@/lib/campaigns/campaign-api'
import { fetchPrograms } from '@/lib/programs/programs-api'
import { fetchSpaces, type SpaceSummary } from '@/lib/spaces'
import { cn } from '@/lib/utils/cn'

const MENU_WIDTH = 280

type SpaceOption = { id: string; title: string; visibility: 'private' | 'team' }
type MappingGroup = { campaignId: string; label: string; spaces: SpaceOption[] }

/**
 * Program → campaign → space cascade for relocating an action item. Groups
 * spaces by campaign (campaign rows carry the program name) so picking a
 * destination remaps the item in one move.
 */
function useMappingGroups(open: boolean, excludeSpaceId: string) {
  const [groups, setGroups] = useState<MappingGroup[] | null>(null)

  useEffect(() => {
    if (!open || groups !== null) return
    let cancelled = false
    void Promise.all([
      fetchSpaces<SpaceSummary>().catch(() => [] as SpaceSummary[]),
      fetchCampaigns().catch(() => [] as Campaign[]),
      fetchPrograms().catch(() => []),
    ]).then(([spaces, campaigns, programs]) => {
      if (cancelled) return
      const programNameById = new Map(programs.map((program) => [program.id, program.name]))
      // Same ordering as the space switcher: General campaign first, then A–Z.
      const ordered = [...campaigns].sort((a, b) => {
        const aGeneral = (a.config as Record<string, unknown>)?.system_kind === 'general'
        const bGeneral = (b.config as Record<string, unknown>)?.system_kind === 'general'
        if (aGeneral !== bGeneral) return aGeneral ? -1 : 1
        return (a.name ?? '').localeCompare(b.name ?? '')
      })
      const next = ordered
        .map((campaign) => {
          const programName = campaign.program_id
            ? programNameById.get(campaign.program_id)
            : undefined
          return {
            campaignId: campaign.id,
            label: programName ? `${programName} · ${campaign.name}` : campaign.name,
            spaces: spaces
              .filter((space) => space.campaign_id === campaign.id && space.id !== excludeSpaceId)
              .map((space) => ({
                id: space.id,
                title: space.title,
                visibility: space.visibility ?? 'private',
              })),
          }
        })
        .filter((group) => group.spaces.length > 0)
      setGroups(next)
    })
    return () => {
      cancelled = true
    }
  }, [open, groups, excludeSpaceId])

  return groups
}

export function MeetingActionMoveMenu({
  action,
  spaceId,
  onMoved,
}: {
  action: MeetingAction
  spaceId: string
  onMoved: (action: MeetingAction, destinationTitle: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [moving, setMoving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const groups = useMappingGroups(open, spaceId)

  useEffect(() => {
    const first = groups?.[0]
    if (open && expandedId === null && first) setExpandedId(first.campaignId)
  }, [open, expandedId, groups])

  const toggle = useCallback(() => {
    setOpen((current) => {
      if (!current && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect()
        setPosition({
          top: rect.bottom + 4,
          left: Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8)),
        })
      }
      return !current
    })
  }, [])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  const pick = async (space: SpaceOption) => {
    if (moving) return
    setMoving(true)
    try {
      await transferMeetingActionToSpace(spaceId, action.id, space.id)
      setOpen(false)
      onMoved(action, space.title)
    } catch {
      toast.error(HOME_TOAST_ERRORS.MEETING_ACTION_MOVE_FAILED.userMessage)
    } finally {
      setMoving(false)
    }
  }

  return (
    <>
      <Tooltip label="Map to a client, campaign, or space" side="top">
        <button
          ref={buttonRef}
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            toggle()
          }}
          className="btn-icon-bare shrink-0"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Move ${action.title} to another space`}
        >
          <FolderInput className="icon-xs" aria-hidden />
        </button>
      </Tooltip>
      {open && position
        ? // Portal to body: ancestors of the workspace animate with transforms,
          // which would re-base position:fixed and throw the menu off-screen.
          createPortal(
            <div
              ref={panelRef}
              role="menu"
              onClick={(event) => event.stopPropagation()}
              className="z-dropdown rounded-spacing-2 border-border surface-card py-spacing-2 px-spacing-3 gap-spacing-1 fixed flex flex-col overflow-y-auto border shadow-lg"
              style={{
                top: position.top,
                left: position.left,
                width: MENU_WIDTH,
                maxHeight: `calc(100vh - ${position.top + 8}px)`,
              }}
            >
              <p className="typo-caption text-muted-foreground px-spacing-2 pt-spacing-1">
                {moving ? 'Moving…' : 'Move to'}
              </p>
              {groups === null ? (
                <p className="px-spacing-2 py-spacing-1 body-3 text-muted-foreground/70">
                  Loading…
                </p>
              ) : groups.length === 0 ? (
                <p className="px-spacing-2 py-spacing-1 body-3 text-muted-foreground/70">
                  No other spaces to move to
                </p>
              ) : (
                groups.map((group) => {
                  const expanded = expandedId === group.campaignId
                  return (
                    <div key={group.campaignId} className="mb-spacing-1">
                      <button
                        type="button"
                        aria-expanded={expanded}
                        onClick={() => setExpandedId(expanded ? null : group.campaignId)}
                        className="body-3 text-muted-foreground hover:bg-hover-subtle hover:text-foreground gap-spacing-2 rounded-spacing-2 px-spacing-2 py-spacing-1 flex w-full min-w-0 items-center font-semibold transition-colors"
                      >
                        <ChevronRight
                          className={cn(
                            'h-3 w-3 shrink-0 transition-transform duration-150',
                            expanded && 'rotate-90',
                          )}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate text-left">{group.label}</span>
                        <span className="typo-caption text-muted-foreground shrink-0">
                          {group.spaces.length}
                        </span>
                      </button>
                      {expanded ? (
                        <div className="border-border mt-spacing-1 ml-spacing-1 pl-spacing-2 flex flex-col border-l">
                          {group.spaces.map((space) => {
                            const VisIcon = space.visibility === 'team' ? Globe : Lock
                            return (
                              <button
                                key={space.id}
                                type="button"
                                onClick={() => void pick(space)}
                                className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 rounded-spacing-2 px-spacing-2 py-spacing-1 flex w-full min-w-0 items-center transition-colors"
                              >
                                <VisIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                <span className="min-w-0 truncate">{space.title}</span>
                              </button>
                            )
                          })}
                        </div>
                      ) : null}
                    </div>
                  )
                })
              )}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
