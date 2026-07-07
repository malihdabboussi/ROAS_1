'use client'

import { useState, type MouseEvent } from 'react'
import { ChevronDown } from 'lucide-react'
import { FLOWS_UI } from '@/lib/flows/flows-ui-labels'
import { describeFlowTrigger, countDisplayFlowActions } from '../lib/describe-flow-trigger'
import { writeFlowChatDragData } from '../lib/flow-chat-drag'
import { usesSeparateDraftsSection } from '../lib/flows-grouping'
import type { FlowAutomationSummary } from '../types/flow-automation.types'
import type {
  FlowBuildSessionLink,
  FlowDraftBuildLink,
} from '../types/flow-build-session-link.types'
import type { FlowsGroupBy, FlowsListGroup } from '../types/flows-page.types'
import { FlowDraftCardActions } from './FlowDraftCardActions'
import { FlowCardEnableToggle } from './FlowCardEnableToggle'
import {
  FlowInstallationMeta,
  FlowInstallationRows,
  getFlowInstallationCount,
} from './FlowInstallationSummary'
import { FlowsGroupSectionHeader } from './FlowsGroupSectionHeader'
import {
  FlowDraftsSection,
  FlowCardAttention,
  FlowCardMenuButton,
  type FlowCardMenuHandlers,
} from './FlowsManageGridView'
import { FLOW_DRAFT_STATUS, FlowTitleWithStatusDot } from './FlowStatusDot'

function formatFlowScopeLabel(flow: FlowAutomationSummary) {
  const space = flow.space_title ?? 'Unknown space'
  const campaign = flow.campaign_name
  return campaign ? `${campaign} · ${space}` : space
}

function FlowListRow({
  flow,
  onSelect,
  menuHandlers,
  fallbackSpaceId,
  showScopeMeta = false,
}: {
  flow: FlowAutomationSummary
  onSelect: (flowId: string) => void
  menuHandlers: FlowCardMenuHandlers
  fallbackSpaceId?: string | null
  showScopeMeta?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [contextPosition, setContextPosition] = useState<{ x: number; y: number } | null>(null)
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
    <div>
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
        className="hover:bg-hover-subtle gap-spacing-3 rounded-spacing-2 px-spacing-3 py-spacing-2 group flex w-full cursor-pointer items-center text-left transition-colors"
      >
        <FlowCardEnableToggle flow={flow} onToggleEnabled={menuHandlers.onToggleEnabled} />
        <div className="gap-spacing-1 flex min-w-0 flex-1 flex-col">
          <span className="body-2 text-foreground font-medium">
            <FlowTitleWithStatusDot title={flow.name} flow={flow} />
          </span>
          {showScopeMeta ? (
            <span className="typo-caption text-muted-foreground block">
              {formatFlowScopeLabel(flow)}
            </span>
          ) : null}
          <span className="typo-caption text-muted-foreground">
            {describeFlowTrigger(flow.trigger)} → {countDisplayFlowActions(flow.actions)} action
            {countDisplayFlowActions(flow.actions) !== 1 ? 's' : ''}
          </span>
        </div>
        <FlowInstallationMeta flow={flow} />
        <div
          className="gap-spacing-2 flex shrink-0 items-center"
          onClick={(event) => event.stopPropagation()}
        >
          {!hasMultipleInstallations ? (
            <FlowCardAttention flow={flow} menuHandlers={menuHandlers} inline />
          ) : null}
          {hasMultipleInstallations ? (
            <ChevronDown
              className={`icon-sm text-muted-foreground shrink-0 transition-transform ${
                expanded ? 'rotate-180' : ''
              }`}
            />
          ) : (
            <FlowCardMenuButton
              target={{ kind: 'flow', flow }}
              handlers={menuHandlers}
              contextPosition={contextPosition}
              onContextHandled={() => setContextPosition(null)}
            />
          )}
        </div>
      </div>
      {expanded ? (
        <div className="pl-spacing-6">
          <FlowInstallationRows
            flow={flow}
            onOpenInstallation={(installation) =>
              onSelect(installation.automation_id ?? installation.id)
            }
          />
        </div>
      ) : null}
    </div>
  )
}

function FlowDraftListRow({
  flow,
  link,
  onOpenPlan,
  onOpenDraft,
  onOpenSession,
  menuHandlers,
  fallbackSpaceId,
}: {
  flow: FlowAutomationSummary
  link: FlowDraftBuildLink
  onOpenPlan: (flowId: string, sessionId: string) => void
  onOpenDraft: (flowId: string) => void
  onOpenSession: (flowId: string, conversationId: string) => void
  menuHandlers: FlowCardMenuHandlers
  fallbackSpaceId?: string | null
}) {
  const [contextPosition, setContextPosition] = useState<{ x: number; y: number } | null>(null)
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

function FlowBuildSessionDraftListRow({
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

export function FlowsManageListView({
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
    <div className="space-y-spacing-1">
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
          variant="list"
        />
      ) : null}
      {groups && groups.length > 0
        ? groups.map((group) => {
            const expanded = !collapsedGroupKeys.has(group.key)
            return (
              <div key={group.key}>
                <FlowsGroupSectionHeader
                  group={group}
                  expanded={expanded}
                  onToggle={() => onToggleGroup(group.key)}
                  sticky
                />
                {expanded ? (
                  <>
                    {group.items.map((flow) =>
                      flow.is_draft ? (
                        <FlowDraftListRow
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
                          fallbackSpaceId={menuHandlers.selectedSpaceId}
                        />
                      ) : (
                        <FlowListRow
                          key={flow.id}
                          flow={flow}
                          onSelect={onSelectFlow}
                          menuHandlers={menuHandlers}
                          fallbackSpaceId={menuHandlers.selectedSpaceId}
                          showScopeMeta={showScopeMeta}
                        />
                      ),
                    )}
                    {group.orphanSessions?.map((session) => (
                      <FlowBuildSessionDraftListRow
                        key={session.id}
                        session={session}
                        onOpenBuildSession={onOpenBuildSession}
                        onOpenPlan={onOpenDraftPlan}
                        onOpenDraft={onOpenDraftFlow}
                        onOpenSession={onOpenDraftSession}
                        menuHandlers={menuHandlers}
                      />
                    ))}
                  </>
                ) : null}
              </div>
            )
          })
        : flows.length > 0
          ? flows.map((flow) => (
              <FlowListRow
                key={flow.id}
                flow={flow}
                onSelect={onSelectFlow}
                menuHandlers={menuHandlers}
                fallbackSpaceId={menuHandlers.selectedSpaceId}
                showScopeMeta={showScopeMeta}
              />
            ))
          : null}
    </div>
  )
}
