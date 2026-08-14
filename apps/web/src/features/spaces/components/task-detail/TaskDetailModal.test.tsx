import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MissionDeliverable } from '@/lib/missions'
import type { TeamRosterEntry } from '@/lib/team'
import type { SpaceItem } from '../../types'
import type { FieldDef, SpaceSchema, ViewDef } from '../../types/space-schema'
import { TaskDetailModal } from './TaskDetailModal'

const mocks = vi.hoisted(() => ({
  appendActivityRow: vi.fn(),
  deleteItem: vi.fn(),
  deleteSpaceItem: vi.fn(),
  fetchCampaignTeam: vi.fn(),
  openConversationInSpaceChat: vi.fn(),
  pushToAgent: vi.fn(),
  reload: vi.fn(),
  setChatCollapsed: vi.fn(),
  setSubtasks: vi.fn(),
  updateItem: vi.fn(),
  updateSpaceItem: vi.fn(),
  useTaskDetailData: vi.fn(),
  storeState: {
    items: [] as unknown[],
    spaces: [{ id: 'space-1', title: 'Launch Space', campaign_id: 'campaign-1' }],
  },
}))

const componentMocks = vi.hoisted(() => ({
  DeliverablesCarousel: vi.fn(
    ({
      deliverables,
      headingLabel,
      onSelect,
    }: {
      deliverables: MissionDeliverable[]
      headingLabel?: string
      onSelect: (deliverable: MissionDeliverable) => void
    }) => (
      <section data-testid="deliverables-carousel">
        <h2>{headingLabel}</h2>
        {deliverables.map((deliverable) => (
          <button key={deliverable.id} type="button" onClick={() => onSelect(deliverable)}>
            Open {deliverable.title}
          </button>
        ))}
      </section>
    ),
  ),
  DeliverablePreviewModal: vi.fn(
    ({
      agents,
      campaignId,
      deliverable,
      fallbackSpaceId,
      renderEntityPreview,
    }: {
      agents: Array<{ name: string; role: string; level?: string }>
      campaignId: string | null
      deliverable: MissionDeliverable
      fallbackSpaceId: string
      renderEntityPreview?: () => ReactNode
    }) => (
      <div data-testid="deliverable-preview">
        <span>deliverable: {deliverable.title}</span>
        <span>campaign: {campaignId}</span>
        <span>space: {fallbackSpaceId}</span>
        <span>
          agents:{' '}
          {agents.map((agent) => `${agent.name}:${agent.role}:${agent.level ?? ''}`).join(',')}
        </span>
        <span>renderer: {renderEntityPreview ? 'present' : 'missing'}</span>
      </div>
    ),
  ),
  ShareModal: vi.fn(({ open }: { open: boolean }) =>
    open ? <div data-testid="share-modal" /> : null,
  ),
  TaskActivity: vi.fn(
    ({
      isAgentWorking,
      onOpenSendToAgent,
    }: {
      isAgentWorking?: boolean
      onOpenSendToAgent?: (seed?: { html: string }) => void
    }) => (
      <aside data-testid="task-activity" data-agent-working={String(Boolean(isAgentWorking))}>
        <button
          type="button"
          onClick={() => onOpenSendToAgent?.({ html: '<p>Existing instructions</p>' })}
        >
          Send from activity
        </button>
      </aside>
    ),
  ),
  TaskDescription: vi.fn(({ description }: { description: string | null }) => (
    <div data-testid="task-description">{description}</div>
  )),
  TaskDetailHeader: vi.fn(
    ({
      committedTitle,
      onOpenMenu,
    }: {
      committedTitle: string
      onOpenMenu?: (anchor: HTMLElement) => void
    }) => (
      <header data-testid="task-detail-header">
        <span>{committedTitle}</span>
        <button type="button" onClick={(event) => onOpenMenu?.(event.currentTarget)}>
          More actions
        </button>
      </header>
    ),
  ),
  TaskMenuDropdown: vi.fn(({ onSendToAgent }: { onSendToAgent?: () => void }) => (
    <div data-testid="task-menu">
      <button type="button" onClick={onSendToAgent}>
        Send to agent
      </button>
    </div>
  )),
  TaskMetaFields: vi.fn(() => <div data-testid="task-meta-fields" />),
  TaskSubtasks: vi.fn(() => <div data-testid="task-subtasks" />),
  TaskTitleInput: vi.fn(
    ({ title, onTitleChange }: { title: string; onTitleChange: (value: string) => void }) => (
      <input
        aria-label="Task title"
        value={title}
        onChange={(event) => onTitleChange(event.currentTarget.value)}
      />
    ),
  ),
  SendTaskToAgentModal: vi.fn(
    ({
      initialInstructionsHtml,
      open,
    }: {
      initialInstructionsHtml?: string | null
      open: boolean
    }) =>
      open ? (
        <div data-testid="send-task-modal">seed: {initialInstructionsHtml ?? 'empty'}</div>
      ) : null,
  ),
}))

vi.mock('@/components/deliverables/DeliverablePreviewModal', () => ({
  DeliverablePreviewModal: componentMocks.DeliverablePreviewModal,
}))

vi.mock('@/components/deliverables/deliverable-entity-preview-renderer', () => ({
  renderDeliverableEntityPreview: vi.fn(() => <div data-testid="entity-preview" />),
}))

vi.mock('@/components/deliverables/DeliverablesCarousel', () => ({
  DeliverablesCarousel: componentMocks.DeliverablesCarousel,
}))

vi.mock('@/lib/campaigns', () => ({
  fetchCampaignTeam: mocks.fetchCampaignTeam,
}))

vi.mock('../ShareModal', () => ({
  ShareModal: componentMocks.ShareModal,
}))

vi.mock('../task-menu/TaskMenuDropdown', () => ({
  TaskMenuDropdown: componentMocks.TaskMenuDropdown,
}))

vi.mock('./SendTaskToAgentModal', () => ({
  SendTaskToAgentModal: componentMocks.SendTaskToAgentModal,
}))

vi.mock('./TaskActivity', () => ({
  TaskActivity: componentMocks.TaskActivity,
}))

vi.mock('./TaskDescription', () => ({
  TaskDescription: componentMocks.TaskDescription,
}))

vi.mock('./TaskDetailHeader', () => ({
  TaskDetailHeader: componentMocks.TaskDetailHeader,
}))

vi.mock('./TaskMetaFields', () => ({
  TaskMetaFields: componentMocks.TaskMetaFields,
}))

vi.mock('./TaskSubtasks', () => ({
  TaskSubtasks: componentMocks.TaskSubtasks,
}))

vi.mock('./TaskTitleInput', () => ({
  TaskTitleInput: componentMocks.TaskTitleInput,
}))

vi.mock('../../hooks/useTaskDetailData', () => ({
  useTaskDetailData: mocks.useTaskDetailData,
}))

vi.mock('../../services/spaces.service', () => ({
  createSpaceItem: vi.fn(),
  deleteSpaceItem: mocks.deleteSpaceItem,
  updateSpaceItem: mocks.updateSpaceItem,
}))

vi.mock('../../store/use-spaces-store', () => {
  const useSpacesStore = (selector?: (state: typeof storeState) => unknown) =>
    selector ? selector(storeState) : storeState
  const storeState = {
    items: mocks.storeState.items,
    spaces: mocks.storeState.spaces,
    updateItem: mocks.updateItem,
    pushToAgent: mocks.pushToAgent,
    openConversationInSpaceChat: mocks.openConversationInSpaceChat,
    setChatCollapsed: mocks.setChatCollapsed,
    deleteItem: mocks.deleteItem,
  }
  useSpacesStore.getState = () => storeState
  return { useSpacesStore }
})

const deliverable: MissionDeliverable = {
  id: 'deliverable-1',
  mission_id: 'mission-1',
  campaign_id: 'campaign-1',
  user_id: 'user-1',
  agent_key: 'agent-a',
  type: 'doc',
  title: 'Launch Doc',
  content: null,
  file_url: null,
  file_name: null,
  file_size: null,
  mime_type: null,
  metadata: {},
  entity_id: null,
  entity_table: null,
  created_at: '2026-06-29T10:00:00.000Z',
}

const item: SpaceItem = {
  id: 'task-1',
  space_id: 'space-1',
  org_id: 'org-1',
  user_id: 'user-1',
  title: 'Launch task',
  status: 'todo',
  priority: null,
  assignee_type: 'unassigned',
  assignee_id: null,
  assignees: [],
  start_date: null,
  due_date: null,
  recurrence: null,
  parent_item_id: null,
  recurrence_parent_id: null,
  description: 'Build the launch task.',
  notes: null,
  doc_body: null,
  source: 'manual',
  linked_mission_id: null,
  form_id: null,
  task_execution_status: 'running',
  is_private: false,
  share_link_enabled: false,
  share_token: null,
  sort_order: 0,
  custom_data: {
    cursor_agent_id: 'cursor-1',
    cursor_branch: 'codex/task-cleanup',
    cursor_summary: 'Working on task cleanup',
  },
  created_at: '2026-06-29T09:00:00.000Z',
  updated_at: '2026-06-29T09:00:00.000Z',
}

const activeView: ViewDef = {
  id: 'view-1',
  name: 'Tasks',
  type: 'list',
  sort: [],
}

const spaceSchema: SpaceSchema = {
  version: 1,
  fields: [],
  views: [activeView],
}

const roster: TeamRosterEntry[] = []

const props = {
  item,
  allFields: [] as FieldDef[],
  activeView,
  spaceSchema,
  onViewPatch: vi.fn(async () => {}),
  roster,
  currentUserId: 'user-1',
  campaignId: 'campaign-1',
  onClose: vi.fn(),
  onUpdated: vi.fn(),
}

describe('TaskDetailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetchCampaignTeam.mockResolvedValue([
      {
        campaign_id: 'campaign-1',
        agent_key: 'agent-a',
        name: 'Agent One',
        status: 'idle',
        role: 'strategist',
        level: 'manager',
        created_at: '2026-06-29T08:00:00.000Z',
        updated_at: '2026-06-29T08:00:00.000Z',
      },
    ])
    mocks.useTaskDetailData.mockReturnValue({
      subtasks: [],
      taskDeliverables: [deliverable],
      missionLogs: [],
      loading: false,
      reload: mocks.reload,
      setSubtasks: mocks.setSubtasks,
      appendActivityRow: mocks.appendActivityRow,
    })
    document.body.innerHTML = ''
  })

  afterEach(() => {
    cleanup()
  })

  it('mounts task detail wiring, opens deliverable preview, and settles across rerenders', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { rerender } = render(<TaskDetailModal {...props} />)

    expect(await screen.findByTestId('task-detail-header')).toHaveTextContent('Launch task')
    expect(screen.getByRole('textbox', { name: 'Task title' })).toHaveValue('Launch task')
    expect(screen.getByTestId('task-activity')).toHaveAttribute('data-agent-working', 'true')
    expect(screen.getByText('Status: Running')).toBeInTheDocument()
    expect(screen.getByText('Branch: codex/task-cleanup')).toBeInTheDocument()
    expect(screen.getByTestId('deliverables-carousel')).toHaveTextContent('Deliverables & media')

    await waitFor(() => expect(mocks.fetchCampaignTeam).toHaveBeenCalledWith('campaign-1'))

    fireEvent.click(screen.getByRole('button', { name: 'Open Launch Doc' }))

    expect(await screen.findByTestId('deliverable-preview')).toHaveTextContent(
      'deliverable: Launch Doc',
    )
    expect(screen.getByTestId('deliverable-preview')).toHaveTextContent('campaign: campaign-1')
    expect(screen.getByTestId('deliverable-preview')).toHaveTextContent('space: space-1')
    expect(screen.getByTestId('deliverable-preview')).toHaveTextContent(
      'agents: Agent One:strategist:manager',
    )
    expect(screen.getByTestId('deliverable-preview')).toHaveTextContent('renderer: present')

    fireEvent.click(screen.getByRole('button', { name: 'More actions' }))
    fireEvent.click(screen.getByRole('button', { name: 'Send to agent' }))
    expect(screen.getByTestId('send-task-modal')).toHaveTextContent('seed: empty')

    fireEvent.click(screen.getByRole('button', { name: 'Send from activity' }))
    expect(screen.getByTestId('send-task-modal')).toHaveTextContent(
      'seed: <p>Existing instructions</p>',
    )

    rerender(<TaskDetailModal {...props} item={{ ...item, title: 'Updated task' }} />)
    expect(await screen.findByRole('textbox', { name: 'Task title' })).toHaveValue('Updated task')

    expect(
      consoleError.mock.calls.some((call) =>
        call.some((part) => String(part).includes('Maximum update depth')),
      ),
    ).toBe(false)
    consoleError.mockRestore()
  })

  it('renders panel presentation inline without the activity column', async () => {
    const { container } = render(<TaskDetailModal {...props} presentation="panel" />)

    expect(await screen.findByTestId('task-detail-header')).toHaveTextContent('Launch task')
    expect(container.querySelector('[data-dropzone]')).toHaveClass('pl-spacing-6')
    expect(screen.queryByTestId('task-activity')).not.toBeInTheDocument()
  })
})
