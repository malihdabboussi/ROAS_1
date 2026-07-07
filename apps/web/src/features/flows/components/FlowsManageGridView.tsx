'use client'

import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { ChevronDown, MoreHorizontal, Zap } from 'lucide-react'
import { ConfirmDialog } from '@/features/settings/components/settings-content/ConfirmDialog'
import { FLOWS_UI } from '@/lib/flows/flows-ui-labels'
import type { SpaceSummary } from '@/lib/spaces/spaces-api'
import { countDisplayFlowActions, describeFlowTrigger } from '../lib/describe-flow-trigger'
import { writeFlowChatDragData } from '../lib/flow-chat-drag'
import { usesSeparateDraftsSection } from '../lib/flows-grouping'
import type { FlowValidationResult } from '../services/flows.service'
import type { FlowAutomationSummary } from '../types/flow-automation.types'
import type {
  FlowBuildSessionLink,
  FlowDraftBuildLink,
} from '../types/flow-build-session-link.types'
import type { FlowsGroupBy, FlowsListGroup } from '../types/flows-page.types'
import { FlowCardAttentionAlert } from './FlowCardAttentionAlert'
import { FlowCardEnableToggle } from './FlowCardEnableToggle'
import { FlowDraftCardActions } from './FlowDraftCardActions'
import {
  FlowInstallationMeta,
  FlowInstallationRows,
  getFlowInstallationCount,
} from './FlowInstallationSummary'
import { FlowMenuDropdown } from './FlowMenuDropdown'
import { FlowRenameDialog } from './FlowRenameDialog'
import { suppressFlowCardOpen } from '../lib/flow-card-open-suppress'
import { FlowsGroupSectionHeader } from './FlowsGroupSectionHeader'
import { FLOW_DRAFT_STATUS, FlowTitleWithStatusDot } from './FlowStatusDot'

function formatFlowScopeLabel(flow: FlowAutomationSummary) {
  const space = flow.space_title ?? 'Unknown space'
  const campaign = flow.campaign_name
  return campaign ? `${campaign} · ${space}` : space
}

function flowCardDescription(flow: FlowAutomationSummary) {
  return flow.description?.trim() || 'No description yet.'
}

export type FlowCardMenuHandlers = {
  spaces: SpaceSummary[]
  onOpenPlan: (flowId: string, sessionId: string) => void
  onOpenDraft: (flowId: string) => void
  onOpenSession: (flowId: string, conversationId: string) => void
  onRenameFlow: (flow: FlowAutomationSummary, name: string) => void | Promise<void>
  onDuplicateFlow: (flow: FlowAutomationSummary, targetSpaceId?: string) => void | Promise<void>
  onMakeAsTemplate: (flow: FlowAutomationSummary) => void | Promise<void>
  onValidateFlow: (flow: FlowAutomationSummary) => void | Promise<void>
  onToggleEnabled: (flow: FlowAutomationSummary, enabled: boolean) => void | Promise<void>
  onPublishFlow: (flow: FlowAutomationSummary) => void | Promise<void>
  onDeleteFlow: (flow: FlowAutomationSummary) => void | Promise<void>
  onDiscardBuild: (session: FlowBuildSessionLink) => void | Promise<void>
  onGoToSpace: (spaceId: string) => void
  onGoToCampaign: (campaignId: string) => void
  onViewRunHistory: (flow: FlowAutomationSummary) => void
  onAskLoopToUpdate: (flow: FlowAutomationSummary) => void | Promise<void>
  onAskLoopToFix: (prompt: string) => void
  onFlowValidated?: (flowId: string, result: FlowValidationResult) => void
  selectedSpaceId?: string | null
}

function FlowCardMenuButton({
  target,
  handlers,
  contextPosition,
  onContextHandled,
}: {
  target:
    | { kind: 'flow'; flow: FlowAutomationSummary; link?: FlowDraftBuildLink | null }
    | { kind: 'build'; session: FlowBuildSessionLink; link: FlowDraftBuildLink }
  handlers: FlowCardMenuHandlers
  contextPosition?: { x: number; y: number } | null
  onContextHandled?: () => void
}) {
  const anchorRef = useRef<HTMLButtonElement | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [pointerPosition, setPointerPosition] = useState<{ x: number; y: number } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<typeof target | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [pendingRename, setPendingRename] = useState<FlowAutomationSummary | null>(null)
  const [renameBusy, setRenameBusy] = useState(false)

  const pendingFlow = pendingDelete?.kind === 'flow' ? pendingDelete.flow : null
  const pendingBuildSession = pendingDelete?.kind === 'build' ? pendingDelete.session : null
  const pendingDeleteTitle =
    pendingFlow?.name ?? pendingBuildSession?.plan_name?.trim() ?? 'New flow build'

  useEffect(() => {
    if (!contextPosition) return
    setPointerPosition(contextPosition)
    setMenuOpen(true)
    onContextHandled?.()
  }, [contextPosition, onContextHandled])

  const requestDelete = () => {
    setPendingDelete(target)
    setMenuOpen(false)
  }

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          setPointerPosition(null)
          setMenuOpen(true)
        }}
        className="btn-icon-bare opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
        aria-label="Flow actions"
      >
        <MoreHorizontal className="icon-sm" />
      </button>
      {menuOpen ? (
        <FlowMenuDropdown
          target={target}
          spaces={handlers.spaces}
          anchorRef={anchorRef}
          pointerPosition={pointerPosition}
          onClose={() => setMenuOpen(false)}
          onOpenFlow={handlers.onOpenDraft}
          onOpenPlan={handlers.onOpenPlan}
          onOpenSession={handlers.onOpenSession}
          onDuplicateFlow={handlers.onDuplicateFlow}
          onMakeAsTemplate={handlers.onMakeAsTemplate}
          onValidateFlow={handlers.onValidateFlow}
          onToggleEnabled={handlers.onToggleEnabled}
          onPublishFlow={handlers.onPublishFlow}
          onGoToSpace={handlers.onGoToSpace}
          onGoToCampaign={handlers.onGoToCampaign}
          onViewRunHistory={handlers.onViewRunHistory}
          onAskLoopToUpdate={handlers.onAskLoopToUpdate}
          onRequestRename={(flow) => {
            setMenuOpen(false)
            setPendingRename(flow)
          }}
          onRequestDelete={requestDelete}
        />
      ) : null}
      {pendingRename ? (
        <FlowRenameDialog
          open
          initialName={pendingRename.name}
          confirming={renameBusy}
          onOpenChange={(open) => {
            if (!open && !renameBusy) setPendingRename(null)
          }}
          onConfirm={async (name) => {
            setRenameBusy(true)
            try {
              await handlers.onRenameFlow(pendingRename, name)
              setPendingRename(null)
            } finally {
              setRenameBusy(false)
            }
          }}
        />
      ) : null}
      {pendingDelete ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open && !deleteBusy) setPendingDelete(null)
          }}
          title={pendingFlow ? 'Delete flow?' : 'Discard build?'}
          description={`"${pendingDeleteTitle}" will be removed.`}
          confirmText={pendingFlow ? 'Delete' : 'Discard'}
          confirmDisabled={deleteBusy}
          confirmingText={pendingFlow ? 'Deleting...' : 'Discarding...'}
          onConfirm={async () => {
            setDeleteBusy(true)
            try {
              if (pendingFlow) {
                suppressFlowCardOpen(pendingFlow.id)
                await handlers.onDeleteFlow(pendingFlow)
              } else if (pendingBuildSession) {
                await handlers.onDiscardBuild(pendingBuildSession)
              }
              window.setTimeout(() => setPendingDelete(null), 0)
            } finally {
              setDeleteBusy(false)
            }
          }}
        />
      ) : null}
    </>
  )
}

function FlowCardAttention({
  flow,
  menuHandlers,
  inline = false,
}: {
  flow: FlowAutomationSummary
  menuHandlers: FlowCardMenuHandlers
  inline?: boolean
}) {
  return (
    <FlowCardAttentionAlert
      flow={flow}
      fallbackSpaceId={menuHandlers.selectedSpaceId}
      onAskLoopToFix={menuHandlers.onAskLoopToFix}
      onFlowValidated={menuHandlers.onFlowValidated}
      inline={inline}
    />
  )
}

export { FlowCardMenuButton, FlowCardAttention }

function FlowGridCard({
  flow,
  onSelect,
  menuHandlers,
  showScopeMeta = false,
}: {
  flow: FlowAutomationSummary
  onSelect: (flowId: string) => void
  menuHandlers: FlowCardMenuHandlers
  showScopeMeta?: boolean
}) {
  const [contextPosition, setContextPosition] = useState<{ x: number; y: number } | null>(null)
  const [expanded, setExpanded] = useState(false)
  const fallbackSpaceId = menuHandlers.selectedSpaceId ?? null
  const installationCount = getFlowInstallationCount(flow)
  const hasMultipleInstallations = installationCount > 1
  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault()
    setContextPosition({ x: event.clientX, y: event.clientY })
  }
  const handleSelect = () => {
    if (hasMultipleInstallations) {
      setExpanded((current) => !current)
      return
    }
    onSelect(flow.automation_id ?? flow.id)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') handleSelect()
      }}
      onContextMenu={handleContextMenu}
      draggable
      onDragStart={(event) => {
        if (!writeFlowChatDragData(event.dataTransfer, flow, fallbackSpaceId)) {
          event.preventDefault()
        }
      }}
      className="section-card rounded-spacing-3 p-spacing-4 gap-spacing-3 hover:bg-hover-subtle group relative flex h-full cursor-pointer flex-col items-stretch text-left transition-colors"
    >
      <span className="gap-spacing-2 flex items-center">
        <FlowCardEnableToggle flow={flow} onToggleEnabled={menuHandlers.onToggleEnabled} />
        <Zap className="icon-sm text-muted-foreground shrink-0" />
        <span className="body-2 text-foreground min-w-0 flex-1 font-semibold leading-snug">
          <FlowTitleWithStatusDot title={flow.name} flow={flow} />
        </span>
        <FlowInstallationMeta flow={flow} />
        {hasMultipleInstallations ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              setExpanded((current) => !current)
            }}
            className="btn-icon-bare"
            aria-label={expanded ? 'Collapse installs' : 'Expand installs'}
          >
            <ChevronDown
              className={`icon-sm transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </button>
        ) : (
          <FlowCardMenuButton
            target={{ kind: 'flow', flow }}
            handlers={menuHandlers}
            contextPosition={contextPosition}
            onContextHandled={() => setContextPosition(null)}
          />
        )}
      </span>
      <span className="body-3 text-muted-foreground line-clamp-2 block">
        {showScopeMeta ? (
          <>
            <span className="block">{formatFlowScopeLabel(flow)}</span>
            <span className="block">{flowCardDescription(flow)}</span>
          </>
        ) : (
          flowCardDescription(flow)
        )}
      </span>
      {expanded ? (
        <FlowInstallationRows
          flow={flow}
          onOpenInstallation={(installation) =>
            onSelect(installation.automation_id ?? installation.id)
          }
        />
      ) : null}
      {!hasMultipleInstallations ? (
        <FlowCardAttention flow={flow} menuHandlers={menuHandlers} />
      ) : null}
    </div>
  )
}

function FlowDraftGridCard({
  flow,
  link,
  onOpenPlan,
  onOpenDraft,
  onOpenSession,
  menuHandlers,
}: {
  flow: FlowAutomationSummary
  link: FlowDraftBuildLink
  onOpenPlan: (flowId: string, sessionId: string) => void
  onOpenDraft: (flowId: string) => void
  onOpenSession: (flowId: string, conversationId: string) => void
  menuHandlers: FlowCardMenuHandlers
}) {
  const [contextPosition, setContextPosition] = useState<{ x: number; y: number } | null>(null)
  const fallbackSpaceId = menuHandlers.selectedSpaceId ?? null
  const handleOpen = () => onOpenDraft(flow.id)
  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault()
    setContextPosition({ x: event.clientX, y: event.clientY })
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') handleOpen()
      }}
      onContextMenu={handleContextMenu}
      draggable
      onDragStart={(event) => {
        if (!writeFlowChatDragData(event.dataTransfer, flow, fallbackSpaceId)) {
          event.preventDefault()
        }
      }}
      className="section-card rounded-spacing-3 p-spacing-4 gap-spacing-3 hover:bg-hover-subtle group relative flex h-full cursor-pointer flex-col items-stretch text-left transition-colors"
    >
      <span className="gap-spacing-2 flex items-center">
        <FlowCardEnableToggle flow={flow} onToggleEnabled={menuHandlers.onToggleEnabled} />
        <Zap className="icon-sm text-muted-foreground shrink-0" />
        <span className="body-2 text-foreground min-w-0 flex-1 font-semibold leading-snug">
          <FlowTitleWithStatusDot title={flow.name} flow={flow} />
        </span>
        <FlowCardMenuButton
          target={{ kind: 'flow', flow, link }}
          handlers={menuHandlers}
          contextPosition={contextPosition}
          onContextHandled={() => setContextPosition(null)}
        />
      </span>
      <span className="body-3 text-muted-foreground line-clamp-2 block">
        {flowCardDescription(flow)}
      </span>
      <div className="mt-auto" onClick={(event) => event.stopPropagation()}>
        <FlowDraftCardActions
          link={link}
          onPlan={() => {
            if (link.sessionId) onOpenPlan(flow.id, link.sessionId)
          }}
          onDraft={() => {
            if (link.draftFlowId) onOpenDraft(link.draftFlowId)
          }}
          onSession={() => {
            if (link.conversationId) onOpenSession(flow.id, link.conversationId)
          }}
        />
      </div>
      <div onClick={(event) => event.stopPropagation()}>
        <FlowCardAttention flow={flow} menuHandlers={menuHandlers} />
      </div>
    </div>
  )
}

function FlowBuildSessionDraftGridCard({
  session,
  onOpenBuildSession,
  onOpenPlan,
  onOpenDraft,
  onOpenSession,
  menuHandlers,
}: {
  session: FlowBuildSessionLink
  onOpenBuildSession: (session: FlowBuildSessionLink) => void
  onOpenPlan: (flowId: string, sessionId: string) => void
  onOpenDraft: (flowId: string) => void
  onOpenSession: (flowId: string, conversationId: string) => void
  menuHandlers: FlowCardMenuHandlers
}) {
  const link: FlowDraftBuildLink = {
    sessionId: session.id,
    conversationId: session.conversation_id,
    draftFlowId: session.automation_id,
  }
  const title = session.plan_name?.trim() || 'New flow build'
  const [contextPosition, setContextPosition] = useState<{ x: number; y: number } | null>(null)
  const handleOpen = () => onOpenBuildSession(session)
  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault()
    setContextPosition({ x: event.clientX, y: event.clientY })
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') handleOpen()
      }}
      onContextMenu={handleContextMenu}
      className="section-card rounded-spacing-3 p-spacing-4 gap-spacing-3 hover:bg-hover-subtle group relative flex h-full cursor-pointer flex-col items-stretch text-left transition-colors"
    >
      <span className="gap-spacing-2 flex items-center">
        <Zap className="icon-sm text-muted-foreground shrink-0" />
        <span className="body-2 text-foreground min-w-0 flex-1 font-semibold leading-snug">
          <FlowTitleWithStatusDot title={title} flow={FLOW_DRAFT_STATUS} />
        </span>
        <FlowCardMenuButton
          target={{ kind: 'build', session, link }}
          handlers={menuHandlers}
          contextPosition={contextPosition}
          onContextHandled={() => setContextPosition(null)}
        />
      </span>
      <span className="body-3 text-muted-foreground line-clamp-2 block">
        {session.plan_description?.trim() || FLOWS_UI.loopBuildInProgress}
      </span>
      <div className="mt-auto" onClick={(event) => event.stopPropagation()}>
        <FlowDraftCardActions
          link={link}
          onPlan={() => onOpenPlan(session.id, session.id)}
          onDraft={() => {
            if (link.draftFlowId) onOpenDraft(link.draftFlowId)
          }}
          onSession={() => {
            if (link.conversationId)
              onOpenSession(link.draftFlowId ?? session.id, link.conversationId)
          }}
        />
      </div>
    </div>
  )
}

function FlowDraftSectionListDraftRow({
  flow,
  link,
  onOpenPlan,
  onOpenDraft,
  onOpenSession,
  menuHandlers,
}: {
  flow: FlowAutomationSummary
  link: FlowDraftBuildLink
  onOpenPlan: (flowId: string, sessionId: string) => void
  onOpenDraft: (flowId: string) => void
  onOpenSession: (flowId: string, conversationId: string) => void
  menuHandlers: FlowCardMenuHandlers
}) {
  const [contextPosition, setContextPosition] = useState<{ x: number; y: number } | null>(null)
  const fallbackSpaceId = menuHandlers.selectedSpaceId ?? null
  const handleOpen = () => onOpenDraft(flow.id)
  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault()
    setContextPosition({ x: event.clientX, y: event.clientY })
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') handleOpen()
      }}
      onContextMenu={handleContextMenu}
      draggable
      onDragStart={(event) => {
        if (!writeFlowChatDragData(event.dataTransfer, flow, fallbackSpaceId)) {
          event.preventDefault()
        }
      }}
      className="gap-spacing-3 rounded-spacing-2 px-spacing-3 py-spacing-2 hover:bg-hover-subtle group flex w-full cursor-pointer items-center text-left transition-colors"
    >
      <FlowCardEnableToggle flow={flow} onToggleEnabled={menuHandlers.onToggleEnabled} />
      <div className="gap-spacing-1 flex min-w-0 flex-1 flex-col">
        <span className="body-2 text-foreground font-medium">
          <FlowTitleWithStatusDot title={flow.name} flow={flow} />
        </span>
        <span className="typo-caption text-muted-foreground">
          {describeFlowTrigger(flow.trigger)} → {countDisplayFlowActions(flow.actions)} action
          {countDisplayFlowActions(flow.actions) !== 1 ? 's' : ''}
        </span>
      </div>
      <div
        className="gap-spacing-2 flex shrink-0 items-center"
        onClick={(event) => event.stopPropagation()}
      >
        <FlowCardAttention flow={flow} menuHandlers={menuHandlers} inline />
        <FlowDraftCardActions
          compact
          link={link}
          onPlan={() => {
            if (link.sessionId) onOpenPlan(flow.id, link.sessionId)
          }}
          onDraft={() => {
            if (link.draftFlowId) onOpenDraft(link.draftFlowId)
          }}
          onSession={() => {
            if (link.conversationId) onOpenSession(flow.id, link.conversationId)
          }}
        />
        <FlowCardMenuButton
          target={{ kind: 'flow', flow, link }}
          handlers={menuHandlers}
          contextPosition={contextPosition}
          onContextHandled={() => setContextPosition(null)}
        />
      </div>
    </div>
  )
}

function FlowDraftSectionListBuildRow({
  session,
  onOpenBuildSession,
  onOpenPlan,
  onOpenDraft,
  onOpenSession,
  menuHandlers,
}: {
  session: FlowBuildSessionLink
  onOpenBuildSession: (session: FlowBuildSessionLink) => void
  onOpenPlan: (flowId: string, sessionId: string) => void
  onOpenDraft: (flowId: string) => void
  onOpenSession: (flowId: string, conversationId: string) => void
  menuHandlers: FlowCardMenuHandlers
}) {
  const link: FlowDraftBuildLink = {
    sessionId: session.id,
    conversationId: session.conversation_id,
    draftFlowId: session.automation_id,
  }
  const title = session.plan_name?.trim() || 'New flow build'
  const [contextPosition, setContextPosition] = useState<{ x: number; y: number } | null>(null)
  const handleOpen = () => onOpenBuildSession(session)
  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault()
    setContextPosition({ x: event.clientX, y: event.clientY })
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') handleOpen()
      }}
      onContextMenu={handleContextMenu}
      className="gap-spacing-3 rounded-spacing-2 px-spacing-3 py-spacing-2 hover:bg-hover-subtle group flex w-full cursor-pointer items-center text-left transition-colors"
    >
      <div className="gap-spacing-1 flex min-w-0 flex-1 flex-col">
        <span className="body-2 text-foreground font-medium">
          <FlowTitleWithStatusDot title={title} flow={FLOW_DRAFT_STATUS} />
        </span>
        <span className="typo-caption text-muted-foreground">
          {FLOWS_UI.loopBuildInProgress} · {session.status.replace(/_/g, ' ')}
        </span>
      </div>
      <div
        className="gap-spacing-2 flex shrink-0 items-center"
        onClick={(event) => event.stopPropagation()}
      >
        <FlowDraftCardActions
          compact
          link={link}
          onPlan={() => onOpenPlan(session.id, session.id)}
          onDraft={() => {
            if (link.draftFlowId) onOpenDraft(link.draftFlowId)
          }}
          onSession={() => {
            if (link.conversationId) {
              onOpenSession(link.draftFlowId ?? session.id, link.conversationId)
            }
          }}
        />
        <FlowCardMenuButton
          target={{ kind: 'build', session, link }}
          handlers={menuHandlers}
          contextPosition={contextPosition}
          onContextHandled={() => setContextPosition(null)}
        />
      </div>
    </div>
  )
}

export function FlowDraftsSection({
  draftFlows,
  orphanBuildSessions,
  draftBuildLinks,
  expanded,
  onToggle,
  onOpenPlan,
  onOpenDraft,
  onOpenSession,
  onOpenBuildSession,
  menuHandlers,
  variant,
}: {
  draftFlows: FlowAutomationSummary[]
  orphanBuildSessions: FlowBuildSessionLink[]
  draftBuildLinks: Map<string, FlowDraftBuildLink>
  expanded: boolean
  onToggle: () => void
  onOpenPlan: (flowId: string, sessionId: string) => void
  onOpenDraft: (flowId: string) => void
  onOpenSession: (flowId: string, conversationId: string) => void
  onOpenBuildSession: (session: FlowBuildSessionLink) => void
  menuHandlers: FlowCardMenuHandlers
  variant: 'grid' | 'list'
}) {
  const draftsGroup: FlowsListGroup = {
    key: 'drafts',
    label: FLOWS_UI.draftsSection,
    color: 'muted',
    items: draftFlows,
    itemCount: draftFlows.length + orphanBuildSessions.length,
  }

  if (variant === 'list') {
    return (
      <div>
        <FlowsGroupSectionHeader
          group={draftsGroup}
          expanded={expanded}
          onToggle={onToggle}
          sticky
        />
        {expanded ? (
          <>
            {draftFlows.map((flow) => {
              const link = draftBuildLinks.get(flow.id) ?? {
                sessionId: null,
                conversationId: null,
                draftFlowId: flow.id,
              }
              return (
                <FlowDraftSectionListDraftRow
                  key={flow.id}
                  flow={flow}
                  link={link}
                  onOpenPlan={onOpenPlan}
                  onOpenDraft={onOpenDraft}
                  onOpenSession={onOpenSession}
                  menuHandlers={menuHandlers}
                />
              )
            })}
            {orphanBuildSessions.map((session) => (
              <FlowDraftSectionListBuildRow
                key={session.id}
                session={session}
                onOpenBuildSession={onOpenBuildSession}
                onOpenPlan={onOpenPlan}
                onOpenDraft={onOpenDraft}
                onOpenSession={onOpenSession}
                menuHandlers={menuHandlers}
              />
            ))}
          </>
        ) : null}
      </div>
    )
  }

  return (
    <div>
      <FlowsGroupSectionHeader group={draftsGroup} expanded={expanded} onToggle={onToggle} />
      {expanded ? (
        <div className="gap-spacing-3 pt-spacing-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {draftFlows.map((flow) => {
            const link = draftBuildLinks.get(flow.id) ?? {
              sessionId: null,
              conversationId: null,
              draftFlowId: flow.id,
            }
            return (
              <FlowDraftGridCard
                key={flow.id}
                flow={flow}
                link={link}
                onOpenPlan={onOpenPlan}
                onOpenDraft={onOpenDraft}
                onOpenSession={onOpenSession}
                menuHandlers={menuHandlers}
              />
            )
          })}
          {orphanBuildSessions.map((session) => (
            <FlowBuildSessionDraftGridCard
              key={session.id}
              session={session}
              onOpenBuildSession={onOpenBuildSession}
              onOpenPlan={onOpenPlan}
              onOpenDraft={onOpenDraft}
              onOpenSession={onOpenSession}
              menuHandlers={menuHandlers}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function FlowsManageGridView({
  groupBy,
  flows,
  groups,
  draftFlows,
  orphanBuildSessions,
  draftBuildLinks,
  collapsedGroupKeys,
  onToggleGroup,
  onSelectFlow,
  onOpenDraftPlan,
  onOpenDraftFlow,
  onOpenDraftSession,
  onOpenBuildSession,
  menuHandlers,
  showScopeMeta = false,
}: {
  groupBy: FlowsGroupBy
  flows: FlowAutomationSummary[]
  groups: FlowsListGroup[] | null
  draftFlows: FlowAutomationSummary[]
  orphanBuildSessions: FlowBuildSessionLink[]
  draftBuildLinks: Map<string, FlowDraftBuildLink>
  collapsedGroupKeys: Set<string>
  onToggleGroup: (groupKey: string) => void
  onSelectFlow: (flowId: string) => void
  onOpenDraftPlan: (flowId: string, sessionId: string) => void
  onOpenDraftFlow: (flowId: string) => void
  onOpenDraftSession: (flowId: string, conversationId: string) => void
  onOpenBuildSession: (session: FlowBuildSessionLink) => void
  menuHandlers: FlowCardMenuHandlers
  showScopeMeta?: boolean
}) {
  const draftsExpanded = !collapsedGroupKeys.has('drafts')
  const showDraftsSection = usesSeparateDraftsSection(groupBy)

  return (
    <div className="gap-spacing-4 flex flex-col">
      {showDraftsSection && (draftFlows.length > 0 || orphanBuildSessions.length > 0) ? (
        <FlowDraftsSection
          draftFlows={draftFlows}
          orphanBuildSessions={orphanBuildSessions}
          draftBuildLinks={draftBuildLinks}
          expanded={draftsExpanded}
          onToggle={() => onToggleGroup('drafts')}
          onOpenPlan={onOpenDraftPlan}
          onOpenDraft={onOpenDraftFlow}
          onOpenSession={onOpenDraftSession}
          onOpenBuildSession={onOpenBuildSession}
          menuHandlers={menuHandlers}
          variant="grid"
        />
      ) : null}
      {groups && groups.length > 0 ? (
        groups.map((group) => {
          const expanded = !collapsedGroupKeys.has(group.key)
          return (
            <div key={group.key}>
              <FlowsGroupSectionHeader
                group={group}
                expanded={expanded}
                onToggle={() => onToggleGroup(group.key)}
              />
              {expanded ? (
                <div className="gap-spacing-3 pt-spacing-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                  {group.items.map((flow) =>
                    flow.is_draft ? (
                      <FlowDraftGridCard
                        key={flow.id}
                        flow={flow}
                        link={
                          draftBuildLinks.get(flow.id) ?? {
                            sessionId: null,
                            conversationId: null,
                            draftFlowId: flow.id,
                          }
                        }
                        onOpenPlan={onOpenDraftPlan}
                        onOpenDraft={onOpenDraftFlow}
                        onOpenSession={onOpenDraftSession}
                        menuHandlers={menuHandlers}
                      />
                    ) : (
                      <FlowGridCard
                        key={flow.id}
                        flow={flow}
                        onSelect={onSelectFlow}
                        menuHandlers={menuHandlers}
                        showScopeMeta={showScopeMeta}
                      />
                    ),
                  )}
                  {group.orphanSessions?.map((session) => (
                    <FlowBuildSessionDraftGridCard
                      key={session.id}
                      session={session}
                      onOpenBuildSession={onOpenBuildSession}
                      onOpenPlan={onOpenDraftPlan}
                      onOpenDraft={onOpenDraftFlow}
                      onOpenSession={onOpenDraftSession}
                      menuHandlers={menuHandlers}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          )
        })
      ) : flows.length > 0 ? (
        <div className="gap-spacing-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {flows.map((flow) => (
            <FlowGridCard
              key={flow.id}
              flow={flow}
              onSelect={onSelectFlow}
              menuHandlers={menuHandlers}
              showScopeMeta={showScopeMeta}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
