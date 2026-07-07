'use client'

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import {
  Bot,
  CheckCircle2,
  ChevronRight,
  Copy,
  Edit2,
  ExternalLink,
  FolderInput,
  History,
  Link2,
  LayoutTemplate,
  MessageSquare,
  Pause,
  Play,
  Route,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { SpaceSummary } from '@/lib/spaces/spaces-api'
import { isUserFlowTemplate } from '@/lib/flows/flow-user-template.utils'
import type { FlowAutomationSummary } from '../types/flow-automation.types'
import type {
  FlowBuildSessionLink,
  FlowDraftBuildLink,
} from '../types/flow-build-session-link.types'

const HOVER_CLOSE_DELAY_MS = 140
const SUBMENU_WIDTH = 240

type FlowMenuTarget =
  | {
      kind: 'flow'
      flow: FlowAutomationSummary
      link?: FlowDraftBuildLink | null
    }
  | {
      kind: 'build'
      session: FlowBuildSessionLink
      link: FlowDraftBuildLink
    }

interface FlowMenuDropdownProps {
  target: FlowMenuTarget
  spaces: SpaceSummary[]
  anchorRef: RefObject<HTMLButtonElement | null>
  pointerPosition?: { x: number; y: number } | null
  onClose: () => void
  onOpenFlow: (flowId: string) => void
  onOpenPlan: (flowId: string, sessionId: string) => void
  onOpenSession: (flowId: string, conversationId: string) => void
  onRequestRename: (flow: FlowAutomationSummary) => void
  onDuplicateFlow: (flow: FlowAutomationSummary, targetSpaceId?: string) => void | Promise<void>
  onMakeAsTemplate: (flow: FlowAutomationSummary) => void | Promise<void>
  onValidateFlow: (flow: FlowAutomationSummary) => void | Promise<void>
  onToggleEnabled: (flow: FlowAutomationSummary, enabled: boolean) => void | Promise<void>
  onPublishFlow: (flow: FlowAutomationSummary) => void | Promise<void>
  onGoToSpace: (spaceId: string) => void
  onGoToCampaign: (campaignId: string) => void
  onViewRunHistory: (flow: FlowAutomationSummary) => void
  onAskLoopToUpdate: (flow: FlowAutomationSummary) => void | Promise<void>
  onRequestDelete: () => void
}

function flowUrl(flow: FlowAutomationSummary): string {
  const url = new URL('/flows', window.location.origin)
  if (flow.campaign_id) url.searchParams.set('campaign_id', flow.campaign_id)
  if (flow.space_id) url.searchParams.set('space_id', flow.space_id)
  url.searchParams.set('flow_id', flow.id)
  return url.toString()
}

function buildUrl(session: FlowBuildSessionLink): string {
  const url = new URL('/flows', window.location.origin)
  if (session.space_id) url.searchParams.set('space_id', session.space_id)
  url.searchParams.set('build_session_id', session.id)
  return url.toString()
}

async function copyText(value: string, label: string) {
  await navigator.clipboard.writeText(value)
  toast.success(`${label} copied`)
}

export function FlowMenuDropdown({
  target,
  spaces,
  anchorRef,
  pointerPosition,
  onClose,
  onOpenFlow,
  onOpenPlan,
  onOpenSession,
  onRequestRename,
  onDuplicateFlow,
  onMakeAsTemplate,
  onValidateFlow,
  onToggleEnabled,
  onPublishFlow,
  onGoToSpace,
  onGoToCampaign,
  onViewRunHistory,
  onAskLoopToUpdate,
  onRequestDelete,
}: FlowMenuDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const copyButtonRef = useRef<HTMLButtonElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [copySubmenuOpen, setCopySubmenuOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: -9999, left: -9999 })
  const [subPos, setSubPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const isFlow = target.kind === 'flow'
  const flow = isFlow ? target.flow : null
  const buildSession = target.kind === 'build' ? target.session : null
  const link = target.kind === 'flow' ? target.link : target.link
  const targetId = flow?.id ?? buildSession?.id ?? ''
  const targetLink = flow ? flowUrl(flow) : buildSession ? buildUrl(buildSession) : ''
  const currentSpaceId = flow?.space_id ?? null
  const copySpaces = spaces.filter((space) => space.id !== currentSpaceId)
  const canCopyToSpace = !!flow && copySpaces.length > 0

  const cancelClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }
  const scheduleClose = () => {
    cancelClose()
    closeTimerRef.current = setTimeout(() => setCopySubmenuOpen(false), HOVER_CLOSE_DELAY_MS)
  }
  useEffect(() => () => cancelClose(), [])

  useLayoutEffect(() => {
    if (!dropdownRef.current) return
    const dropRect = dropdownRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const pad = 8

    if (pointerPosition) {
      let top = pointerPosition.y
      let left = pointerPosition.x + dropRect.width
      if (top + dropRect.height > vh - pad) top = Math.max(pad, vh - dropRect.height - pad)
      if (top < pad) top = pad
      if (left > vw - pad) left = vw - pad
      if (left - dropRect.width < pad) left = pad + dropRect.width
      setPos({ top, left })
      return
    }

    if (!anchorRef.current) return
    const anchorRect = anchorRef.current.getBoundingClientRect()
    let top = anchorRect.bottom + 4
    if (top + dropRect.height > vh - pad) top = anchorRect.top - dropRect.height - 4
    if (top < pad) top = pad
    setPos({ top, left: anchorRect.right })
  }, [anchorRef, pointerPosition])

  useLayoutEffect(() => {
    if (!copySubmenuOpen || !copyButtonRef.current) return
    const rect = copyButtonRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const pad = 8
    let top = rect.top
    let left = rect.right + 4
    if (left + SUBMENU_WIDTH > vw - pad) left = rect.left - SUBMENU_WIDTH - 4
    if (top + 240 > vh - pad) top = Math.max(pad, vh - 240 - pad)
    setSubPos({ top, left })
  }, [copySubmenuOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const targetNode = event.target as HTMLElement
      if (!targetNode.closest('[data-flow-menu]') && !anchorRef.current?.contains(targetNode)) {
        onClose()
      }
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('click', handleClickOutside, true)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('click', handleClickOutside, true)
      document.removeEventListener('keydown', handleKey)
    }
  }, [anchorRef, onClose])

  const close = () => onClose()
  const wrap = (fn: () => void | Promise<void>) => async () => {
    try {
      await fn()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong'
      toast.error(message)
    } finally {
      close()
    }
  }

  const itemCls =
    'gap-spacing-2 body-3 rounded-spacing-2 text-muted-foreground hover:bg-[var(--color-hover-subtle)] hover:text-foreground px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors disabled:opacity-50 disabled:hover:bg-transparent'
  const itemIcon = 'h-3.5 w-3.5 shrink-0'
  const submenuRowCls =
    'gap-spacing-2 body-3 rounded-spacing-2 text-muted-foreground hover:bg-[var(--color-hover-subtle)] hover:text-foreground px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors'
  const quickCellCls =
    'body-3 text-muted-foreground hover:bg-[var(--color-hover-subtle)] hover:text-foreground flex min-h-7 min-w-0 flex-1 items-center justify-center truncate rounded-none px-2 text-center transition-colors'

  return createPortal(
    <>
      <div
        data-flow-menu
        ref={dropdownRef}
        className="z-dropdown rounded-spacing-2 border-border surface-card p-spacing-2 fixed min-w-56 border shadow-lg"
        style={{ top: pos.top, left: pos.left, transform: 'translateX(-100%)' }}
      >
        <div className="border-border mb-spacing-2 overflow-hidden rounded-md border">
          <div className="divide-border flex w-full divide-x">
            <button
              type="button"
              onClick={wrap(() => copyText(targetLink, 'Link'))}
              className={quickCellCls}
            >
              Copy link
            </button>
            <button
              type="button"
              onClick={wrap(() => copyText(targetId, 'ID'))}
              className={quickCellCls}
            >
              Copy ID
            </button>
            <button
              type="button"
              onClick={wrap(() => {
                window.open(targetLink, '_blank', 'noopener,noreferrer')
              })}
              className={quickCellCls}
            >
              New tab
            </button>
          </div>
        </div>

        <div className="gap-spacing-1 px-spacing-1 flex flex-col">
          {flow ? (
            <>
              <button type="button" onClick={wrap(() => onOpenFlow(flow.id))} className={itemCls}>
                <Route className={itemIcon} />
                <span>Open flow</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!flow) return
                  close()
                  onRequestRename(flow)
                }}
                className={itemCls}
              >
                <Edit2 className={itemIcon} />
                <span>Rename</span>
              </button>
              <button type="button" onClick={wrap(() => onDuplicateFlow(flow))} className={itemCls}>
                <Copy className={itemIcon} />
                <span>Duplicate</span>
              </button>
              {!isUserFlowTemplate(flow) ? (
                <button
                  type="button"
                  onClick={wrap(() => onMakeAsTemplate(flow))}
                  className={itemCls}
                >
                  <LayoutTemplate className={itemIcon} />
                  <span>Make as template</span>
                </button>
              ) : null}
              <button type="button" onClick={wrap(() => onValidateFlow(flow))} className={itemCls}>
                <CheckCircle2 className={itemIcon} />
                <span>Validate</span>
              </button>
              <div className="border-border border-t" />
              {flow.is_draft ? (
                <button type="button" onClick={wrap(() => onPublishFlow(flow))} className={itemCls}>
                  <Play className={itemIcon} />
                  <span>Publish</span>
                </button>
              ) : flow.enabled ? (
                <button
                  type="button"
                  onClick={wrap(() => onToggleEnabled(flow, false))}
                  className={itemCls}
                >
                  <Pause className={itemIcon} />
                  <span>Pause</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={wrap(() => onToggleEnabled(flow, true))}
                  className={itemCls}
                >
                  <Play className={itemIcon} />
                  <span>Enable</span>
                </button>
              )}
            </>
          ) : null}

          <div className="border-border border-t" />

          <button
            type="button"
            onClick={wrap(() => {
              if (link?.sessionId) onOpenPlan(flow?.id ?? targetId, link.sessionId)
            })}
            className={itemCls}
            disabled={!link?.sessionId}
          >
            <Route className={itemIcon} />
            <span>View plan</span>
          </button>
          <button
            type="button"
            onClick={wrap(() => {
              if (link?.conversationId)
                onOpenSession(flow?.id ?? link.draftFlowId ?? targetId, link.conversationId)
            })}
            className={itemCls}
            disabled={!link?.conversationId}
          >
            <MessageSquare className={itemIcon} />
            <span>Open Loop session</span>
          </button>

          {flow ? (
            <>
              <div className="border-border border-t" />
              {flow.space_id ? (
                <button
                  type="button"
                  onClick={wrap(() => onGoToSpace(flow.space_id!))}
                  className={itemCls}
                >
                  <ExternalLink className={itemIcon} />
                  <span>Go to space</span>
                </button>
              ) : null}
              {flow.campaign_id ? (
                <button
                  type="button"
                  onClick={wrap(() => onGoToCampaign(flow.campaign_id!))}
                  className={itemCls}
                >
                  <ExternalLink className={itemIcon} />
                  <span>Go to campaign</span>
                </button>
              ) : null}
              <button
                type="button"
                onClick={wrap(() => onViewRunHistory(flow))}
                className={itemCls}
              >
                <History className={itemIcon} />
                <span>View run history</span>
              </button>

              <div className="border-border border-t" />
              <button
                type="button"
                onClick={wrap(() => onAskLoopToUpdate(flow))}
                className={itemCls}
              >
                <Bot className={itemIcon} />
                <span>Ask Loop to update</span>
              </button>

              <div className="border-border border-t" />
              <button
                ref={copyButtonRef}
                type="button"
                onMouseEnter={() => {
                  cancelClose()
                  if (canCopyToSpace) setCopySubmenuOpen(true)
                }}
                onMouseLeave={scheduleClose}
                onFocus={() => {
                  cancelClose()
                  if (canCopyToSpace) setCopySubmenuOpen(true)
                }}
                onClick={() => setCopySubmenuOpen((open) => (canCopyToSpace ? !open : false))}
                className={itemCls}
                disabled={!canCopyToSpace}
                aria-haspopup="menu"
                aria-expanded={copySubmenuOpen}
              >
                <FolderInput className={itemIcon} />
                <span className="flex-1">Copy to space</span>
                <ChevronRight className="h-3 w-3 shrink-0" />
              </button>
            </>
          ) : null}

          <div className="border-border border-t" />
          <button
            type="button"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              event.preventDefault()
              onRequestDelete()
            }}
            className="gap-spacing-2 body-3 rounded-spacing-2 px-spacing-2 py-spacing-1 flex w-full items-center text-left text-red-600 transition-colors hover:bg-red-500/10 [&_svg]:text-red-600"
          >
            <Trash2 className={itemIcon} />
            <span>{flow ? 'Delete flow' : 'Discard build'}</span>
          </button>
        </div>
      </div>

      {copySubmenuOpen && flow ? (
        <div
          data-flow-menu
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          className="z-dropdown rounded-spacing-2 border-border surface-card py-spacing-2 px-spacing-3 gap-spacing-1 fixed flex flex-col overflow-y-auto border shadow-lg"
          style={{
            top: subPos.top,
            left: subPos.left,
            width: SUBMENU_WIDTH,
            maxHeight: `calc(100vh - ${subPos.top + 8}px)`,
          }}
        >
          {copySpaces.map((space) => (
            <button
              key={space.id}
              type="button"
              onClick={() => {
                void onDuplicateFlow(flow, space.id)
                close()
              }}
              className={submenuRowCls}
            >
              <Link2 className={itemIcon} />
              <span className="min-w-0 truncate">{space.title}</span>
            </button>
          ))}
        </div>
      ) : null}
    </>,
    document.body,
  )
}
