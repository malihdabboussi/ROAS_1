'use client'

import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronRight, Plus, Rocket, X } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { dispatchOpenQuickMissions } from '@/features/spaces/components/playbooks/QuickMissionsHubModal'
import { useCachedSpaces } from '@/features/spaces/hooks/use-cached-spaces'
import {
  WORK_SURFACE_LABELS,
  workContextAttachmentDescription,
  workContextAttachmentLabel,
} from '../config/work-context.config'
import type { GlobalWorkSurface } from '../lib/global-chat-storage'
import { useGlobalChatStore } from '../store/use-global-chat-store'
import { useGlobalChatWorkContextMenu } from './use-global-chat-work-context-menu'

const WORK_MENU_WIDTH = 200
const SPACE_SUBMENU_WIDTH = 220

export function GlobalChatComposerFooter() {
  const workContext = useGlobalChatStore((s) => s.workContext)
  const setWorkContext = useGlobalChatStore((s) => s.setWorkContext)
  const activeAgentKey = useGlobalChatStore((s) => s.activeAgentKey)
  const roster = useGlobalChatStore((s) => s.roster)
  const { data: spaceRows } = useCachedSpaces()
  const spaces = useMemo(() => spaceRows ?? [], [spaceRows])
  const menu = useGlobalChatWorkContextMenu()

  const surfaces = (Object.keys(WORK_SURFACE_LABELS) as GlobalWorkSurface[]).filter(
    (surface) => surface !== 'general',
  )
  const selectedSpaceTitle = spaces.find((space) => space.id === workContext.spaceId)?.title
  const attachmentLabel = workContextAttachmentLabel(workContext, selectedSpaceTitle)
  const activeAgentName =
    roster.find((entry) => entry.agent_key === activeAgentKey)?.display_name?.trim() ||
    activeAgentKey
  const attachmentDescription = workContextAttachmentDescription(workContext, {
    activeAgentName,
    spaceTitle: selectedSpaceTitle,
  })

  const portalTarget = typeof document === 'undefined' ? null : document.body

  return (
    <div className="gap-spacing-1 flex min-w-0 items-center">
      <Tooltip label="Quick Missions">
        <button
          type="button"
          onClick={() => dispatchOpenQuickMissions()}
          className="btn-icon-bare-sm text-muted-foreground hover:text-foreground shrink-0"
          aria-label="Open Quick Missions"
        >
          <Rocket className="icon-xs" aria-hidden />
        </button>
      </Tooltip>
      {attachmentLabel ? (
        <>
          <div className="badge-glass badge-glass-sm badge-glass-purple gap-spacing-1 flex min-w-0 items-center font-medium">
            <button
              type="button"
              onClick={() => setWorkContext({ surface: 'general' })}
              className="hover:text-foreground shrink-0"
              aria-label={`Detach ${attachmentLabel} from chat`}
            >
              <X className="icon-xs" aria-hidden />
            </button>
            <Tooltip
              label={attachmentDescription ?? attachmentLabel}
              wide
              delayMs={200}
              triggerClassName="min-w-0"
            >
              <span className="block min-w-0 truncate">{attachmentLabel}</span>
            </Tooltip>
          </div>
          <Tooltip label="Add or change context">
            <button
              ref={menu.buttonRef}
              type="button"
              onClick={menu.toggle}
              className="btn-icon-bare-sm text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Add or change context"
              aria-expanded={menu.open}
              aria-haspopup="listbox"
            >
              <Plus className="icon-xs" aria-hidden />
            </button>
          </Tooltip>
        </>
      ) : (
        <Tooltip label="Add context">
          <button
            ref={menu.buttonRef}
            type="button"
            onClick={menu.toggle}
            className="body-4 text-muted-foreground hover:text-foreground gap-spacing-1 px-spacing-1 py-spacing-1 flex items-center bg-transparent transition-colors"
            aria-expanded={menu.open}
            aria-haspopup="listbox"
          >
            <Plus className="icon-xs shrink-0" aria-hidden />
            <span className="font-medium">Add context</span>
          </button>
        </Tooltip>
      )}

      {menu.open && portalTarget
        ? createPortal(
            <div
              ref={menu.menuRef}
              className="dropdown-menu-solid scrollbar-hide z-dropdown py-spacing-1 fixed max-h-96 overflow-y-auto"
              style={{ top: menu.menuPos.top, left: menu.menuPos.left, width: WORK_MENU_WIDTH }}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseLeave={() => {
                if (!menu.spacesSubmenuOpen) menu.close()
              }}
            >
              <p className="body-4 text-muted-foreground px-spacing-3 pb-spacing-1 pt-spacing-1 font-medium uppercase tracking-wide">
                Work
              </p>
              {surfaces.map((surface) => {
                const isSelected = workContext.surface === surface
                const isSpaces = surface === 'spaces'
                return (
                  <div
                    key={surface}
                    ref={isSpaces ? menu.spacesRowRef : undefined}
                    onMouseEnter={() => {
                      if (isSpaces) {
                        menu.openSpacesSubmenu()
                      } else {
                        menu.scheduleSpacesSubmenuClose()
                      }
                    }}
                    className={`rounded-spacing-1 body-4 hover:bg-hover-subtle mx-spacing-1 px-spacing-2 py-spacing-1 flex w-[calc(100%-8px)] items-center justify-between text-left transition-all ${
                      isSelected ? 'bg-primary/10' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (isSpaces) {
                          if (workContext.spaceId) {
                            setWorkContext({
                              surface: 'spaces',
                              spaceId: workContext.spaceId,
                              campaignId: workContext.campaignId ?? null,
                            })
                          } else if (spaces.length > 0) {
                            const space = spaces[0]
                            if (!space) {
                              setWorkContext({ surface: 'spaces' })
                            } else {
                              setWorkContext({
                                surface: 'spaces',
                                spaceId: space.id,
                                campaignId: space.campaign_id ?? null,
                              })
                            }
                          } else {
                            setWorkContext({ surface: 'spaces' })
                          }
                        } else {
                          setWorkContext({ surface })
                        }
                        menu.close()
                      }}
                      className="text-foreground flex min-w-0 flex-1 items-center justify-between text-left"
                    >
                      <span className="truncate font-medium">{WORK_SURFACE_LABELS[surface]}</span>
                      {isSelected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                    </button>
                    {isSpaces ? (
                      <ChevronRight className="text-muted-foreground ml-spacing-1 h-3.5 w-3.5 shrink-0" />
                    ) : null}
                  </div>
                )
              })}
            </div>,
            portalTarget,
          )
        : null}

      {menu.open && menu.spacesSubmenuOpen && portalTarget
        ? createPortal(
            <div
              ref={menu.spacesSubmenuRef}
              className="dropdown-menu-solid scrollbar-hide z-dropdown py-spacing-1 fixed max-h-96 overflow-y-auto"
              style={{
                top: menu.spacesSubmenuPos.top,
                left: menu.spacesSubmenuPos.left,
                width: SPACE_SUBMENU_WIDTH,
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseEnter={menu.clearSpacesCloseTimer}
              onMouseLeave={menu.scheduleSpacesSubmenuClose}
            >
              <p className="body-4 text-muted-foreground px-spacing-3 pb-spacing-1 pt-spacing-1 font-medium uppercase tracking-wide">
                Space
              </p>
              {spaces.map((space) => {
                const isSelected =
                  workContext.surface === 'spaces' && workContext.spaceId === space.id
                return (
                  <button
                    key={space.id}
                    type="button"
                    onClick={() => {
                      setWorkContext({
                        surface: 'spaces',
                        spaceId: space.id,
                        campaignId: space.campaign_id ?? null,
                      })
                      menu.close()
                    }}
                    className={`rounded-spacing-1 body-4 hover:bg-hover-subtle mx-spacing-1 px-spacing-2 py-spacing-1 flex w-[calc(100%-8px)] items-center justify-between text-left transition-all ${
                      isSelected ? 'bg-primary/10' : ''
                    }`}
                  >
                    <span className="text-foreground truncate font-medium">{space.title}</span>
                    {isSelected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                  </button>
                )
              })}
            </div>,
            portalTarget,
          )
        : null}
    </div>
  )
}
