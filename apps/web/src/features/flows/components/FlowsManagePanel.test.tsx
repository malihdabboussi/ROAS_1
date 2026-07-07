import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { VIBEY_FLOW_DRAG_TYPE } from '../lib/flow-chat-drag'
import { FlowsManagePanel } from './FlowsManagePanel'

vi.mock('./FlowsToolbar', () => ({
  FlowsToolbar: () => <div data-testid="flows-toolbar" />,
}))

const baseProps = {
  viewMode: 'grid' as const,
  onViewModeChange: vi.fn(),
  search: '',
  onSearchChange: vi.fn(),
  searchOpen: false,
  onSearchOpenChange: vi.fn(),
  draftFilter: 'all' as const,
  onDraftFilterChange: vi.fn(),
  enabledFilter: 'all' as const,
  onEnabledFilterChange: vi.fn(),
  triggerFilter: 'all',
  onTriggerFilterChange: vi.fn(),
  triggerFilterOptions: [],
  incompleteOnly: false,
  onIncompleteOnlyChange: vi.fn(),
  sort: 'recent' as const,
  onSortChange: vi.fn(),
  groupBy: 'status' as const,
  onGroupByChange: vi.fn(),
  groupSort: 'asc' as const,
  onGroupSortChange: vi.fn(),
  flows: [],
  spaces: [],
  filteredFlows: [],
  flowGroups: null,
  collapsedGroupKeys: new Set<string>(),
  onToggleGroup: vi.fn(),
  onSelectFlow: vi.fn(),
  draftFlows: [],
  orphanBuildSessions: [],
  draftBuildLinks: new Map(),
  onOpenDraftPlan: vi.fn(),
  onOpenDraftFlow: vi.fn(),
  onOpenDraftSession: vi.fn(),
  onOpenBuildSession: vi.fn(),
  menuHandlers: {
    onRenameFlow: vi.fn(),
    onDuplicateFlow: vi.fn(),
    onMakeAsTemplate: vi.fn(),
    onValidateFlow: vi.fn(),
    onToggleEnabled: vi.fn(),
    onPublishFlow: vi.fn(),
    onDeleteFlow: vi.fn(),
    onDiscardBuild: vi.fn(),
    onGoToSpace: vi.fn(),
    onGoToCampaign: vi.fn(),
    onViewRunHistory: vi.fn(),
    onAskLoopToUpdate: vi.fn(),
    onAskLoopToFix: vi.fn(),
  },
}

describe('FlowsManagePanel', () => {
  it('renders the loading state used by the manage tab', () => {
    render(<FlowsManagePanel {...baseProps} flowsLoading />)

    expect(screen.getByText('Loading flows...')).toBeTruthy()
  })

  it('renders the empty list state before any flows exist', () => {
    render(<FlowsManagePanel {...baseProps} flowsLoading={false} />)

    expect(screen.getByText('No flows yet')).toBeTruthy()
    expect(screen.getByText('Create one to run workflows in this space.')).toBeTruthy()
  })

  it('renders the filtered empty state when filters hide existing flows', () => {
    render(
      <FlowsManagePanel
        {...baseProps}
        flowsLoading={false}
        flows={[
          {
            id: 'flow-1',
            name: 'Welcome lead',
            enabled: false,
            is_draft: true,
            trigger: { type: 'task_created' },
            actions: [{ type: 'add_comment', message_template: 'Hi' }],
          },
        ]}
        filteredFlows={[]}
      />,
    )

    expect(screen.getByText('No flows match your filters')).toBeTruthy()
    expect(
      screen.getByText('Try another search or loosen the filters to bring them back.'),
    ).toBeTruthy()
  })

  it('makes manage flow cards draggable into Loop chat with flow context', () => {
    render(
      <FlowsManagePanel
        {...baseProps}
        flowsLoading={false}
        flows={[
          {
            id: 'flow-1',
            name: 'Welcome lead',
            enabled: true,
            trigger: { type: 'task_created' },
            actions: [{ type: 'add_comment', message_template: 'Hi' }],
            space_id: 'space-1',
          },
        ]}
        filteredFlows={[
          {
            id: 'flow-1',
            name: 'Welcome lead',
            enabled: true,
            trigger: { type: 'task_created' },
            actions: [{ type: 'add_comment', message_template: 'Hi' }],
            space_id: 'space-1',
          },
        ]}
      />,
    )

    const card = screen.getByText('Welcome lead').closest('[role="button"]')
    const dataTransfer = { effectAllowed: 'move', setData: vi.fn() }
    fireEvent.dragStart(card!, { dataTransfer })

    expect(card?.getAttribute('draggable')).toBe('true')
    expect(dataTransfer.effectAllowed).toBe('copy')
    expect(dataTransfer.setData).toHaveBeenCalledWith(
      VIBEY_FLOW_DRAG_TYPE,
      expect.stringContaining('"flowId":"flow-1"'),
    )
  })
})
