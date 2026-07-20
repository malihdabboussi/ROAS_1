import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MissionAgent } from '@/lib/agents'
import type { Mission, MissionDeliverable } from '@/lib/missions'
import type { ViewDef } from '../types/space-schema'
import { MissionsView, type MissionsViewHandle } from './MissionsView'

const mocks = vi.hoisted(() => ({
  fetchMissions: vi.fn(),
  fetchMissionAgents: vi.fn(),
  fetchDeliverablesForMissions: vi.fn(),
  fetchMissionById: vi.fn(),
  fetchSubtasks: vi.fn(),
  createMission: vi.fn(),
  fetchCampaignTeam: vi.fn(),
  getBillingStatus: vi.fn(),
  onViewPatch: vi.fn(),
  routerPush: vi.fn(),
  removeChannel: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.routerPush }),
}))

vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<{ default: React.ComponentType<Record<string, unknown>> }>) => {
    function DynamicComponent(props: Record<string, unknown>) {
      const [Loaded, setLoaded] = React.useState<React.ComponentType<
        Record<string, unknown>
      > | null>(null)
      React.useEffect(() => {
        let mounted = true
        void loader().then((mod) => {
          if (mounted) setLoaded(() => mod.default)
        })
        return () => {
          mounted = false
        }
      }, [])
      return Loaded ? <Loaded {...props} /> : null
    }
    return DynamicComponent
  },
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: () => ({
      on: () => ({
        subscribe: () => ({ name: 'channel' }),
      }),
    }),
    removeChannel: mocks.removeChannel,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock('@/lib/agents', () => ({
  fetchMissionAgents: mocks.fetchMissionAgents,
}))

vi.mock('@/lib/missions', () => ({
  createMission: mocks.createMission,
  fetchDeliverablesForMissions: mocks.fetchDeliverablesForMissions,
  fetchMissionById: mocks.fetchMissionById,
  fetchMissions: mocks.fetchMissions,
  fetchSubtasks: mocks.fetchSubtasks,
  resolveMissionCreateToastMessage: () => 'Could not create mission',
}))

vi.mock('@/lib/billing/billing-api', () => ({
  billingApi: {
    getStatus: mocks.getBillingStatus,
  },
}))

vi.mock('@/lib/campaigns', () => ({
  fetchCampaignTeam: mocks.fetchCampaignTeam,
}))

function ChatInputMock(props: {
  placeholder?: string
  onSend: (content: string, documents?: Array<{ filename: string; fileUrl?: string }>) => void
}) {
  return (
    <div data-testid="mission-capture-input">
      <span>{props.placeholder}</span>
      <button
        type="button"
        onClick={() =>
          props.onSend('Run launch task', [
            {
              filename: 'brief.pdf',
              fileUrl: 'https://cdn.example.com/brief.pdf',
            },
          ])
        }
      >
        Send mission
      </button>
    </div>
  )
}

vi.mock('@/components/chat/ChatInputAdapter', () => ({
  ChatInput: ChatInputMock,
}))

vi.mock('@/components/missions/MissionListAdapter', () => ({
  MissionList: (props: {
    missions: Mission[]
    onSelect: (missionId: string) => void
    deliverablesByMissionId?: Record<string, MissionDeliverable[]>
    onOpenDeliverable?: (deliverable: MissionDeliverable) => void
  }) => {
    const firstMission = props.missions[0]
    const firstDeliverable = firstMission
      ? props.deliverablesByMissionId?.[firstMission.id]?.[0]
      : null
    return (
      <div data-testid="mission-list">
        {props.missions.map((mission) => (
          <button key={mission.id} type="button" onClick={() => props.onSelect(mission.id)}>
            {mission.title}
          </button>
        ))}
        {firstDeliverable ? (
          <button type="button" onClick={() => props.onOpenDeliverable?.(firstDeliverable)}>
            Open deliverable
          </button>
        ) : null}
      </div>
    )
  },
}))

vi.mock('@/components/missions/MissionDetailModalAdapter', () => ({
  MissionDetailModal: (props: { mission: Mission }) => (
    <div data-testid="mission-detail-modal">{props.mission.title}</div>
  ),
}))

vi.mock('@/components/deliverables/DeliverablePreviewModal', () => ({
  DeliverablePreviewModal: (props: {
    deliverable: MissionDeliverable
    renderEntityPreview?: unknown
  }) => (
    <div data-testid="deliverable-preview-modal" data-renderer={typeof props.renderEntityPreview}>
      {props.deliverable.title}
    </div>
  ),
}))

vi.mock('@/components/deliverables/deliverable-entity-preview-renderer', () => ({
  renderDeliverableEntityPreview: vi.fn(),
}))

const mission: Mission = {
  id: 'mission-1',
  user_id: 'user-1',
  parent_mission_id: null,
  campaign_id: 'campaign-1',
  title: 'Launch plan',
  brief: 'Launch brief',
  description: null,
  status: 'in_progress',
  priority: 'medium',
  assigned_agent_key: 'atlas',
  current_agent_key: 'atlas',
  progress_notes: null,
  plan_id: null,
  correlation_id: 'corr-1',
  idempotency_key: 'idem-1',
  retry_count: 0,
  input: {},
  output: {},
  error: null,
  scheduled_at: null,
  created_at: '2026-06-20T10:00:00.000Z',
  updated_at: '2026-06-21T10:00:00.000Z',
  started_at: null,
  completed_at: null,
  subtask_total: 0,
  subtask_done: 0,
}

const createdMission: Mission = {
  ...mission,
  id: 'mission-2',
  title: 'Run launch task',
  updated_at: '2026-06-21T11:00:00.000Z',
}

const agent: MissionAgent = {
  id: 'agent-1',
  user_id: 'user-1',
  agent_key: 'atlas',
  name: 'Atlas',
  role: 'Research',
  status: 'working',
  skills: ['launch strategy'],
  image_url: null,
  created_at: '2026-06-20T10:00:00.000Z',
  updated_at: '2026-06-21T10:00:00.000Z',
}

const deliverable: MissionDeliverable = {
  id: 'deliverable-1',
  mission_id: 'mission-1',
  campaign_id: 'campaign-1',
  user_id: 'user-1',
  agent_key: 'atlas',
  type: 'doc',
  title: 'Launch document',
  content: 'Launch document body',
  file_url: null,
  file_name: null,
  file_size: null,
  mime_type: null,
  entity_id: null,
  entity_table: null,
  metadata: {},
  created_at: '2026-06-21T10:00:00.000Z',
}

const activeView = {
  id: 'view-1',
  type: 'missions',
  name: 'Missions',
  missions_config: {
    visible_columns: ['title', 'documents'],
  },
} as unknown as ViewDef

function renderMissionsView(
  ref = React.createRef<MissionsViewHandle>(),
  view: ViewDef = activeView,
  toolbarSearchQuery?: string,
  spaceId?: string | null,
) {
  const result = render(
    <MissionsView
      ref={ref}
      campaignId="campaign-1"
      campaignName="Launch Campaign"
      spaceId={spaceId}
      activeView={view}
      onViewPatch={mocks.onViewPatch}
      currentUserId="user-1"
      toolbarSearchQuery={toolbarSearchQuery}
    />,
  )
  return { ref, ...result }
}

describe('MissionsView', () => {
  beforeEach(() => {
    mocks.fetchMissions.mockResolvedValue([mission])
    mocks.fetchMissionAgents.mockResolvedValue([agent])
    mocks.fetchDeliverablesForMissions.mockResolvedValue({ 'mission-1': [deliverable] })
    mocks.fetchSubtasks.mockResolvedValue([])
    mocks.fetchMissionById.mockResolvedValue(mission)
    mocks.createMission.mockResolvedValue(createdMission)
    mocks.fetchCampaignTeam.mockResolvedValue([{ agent_key: 'atlas' }])
    mocks.getBillingStatus.mockResolvedValue({ balance: { totalAvailable: 5 } })
    mocks.onViewPatch.mockResolvedValue(undefined)
    mocks.routerPush.mockReset()
    mocks.removeChannel.mockResolvedValue(undefined)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('keeps mission list, deliverable preview, capture send, and rerender behavior stable', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { ref, rerender } = renderMissionsView()

    await screen.findByTestId('mission-list')
    expect(screen.getByText('Launch plan')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Launch plan'))
    expect(await screen.findByTestId('mission-detail-modal')).toHaveTextContent('Launch plan')

    fireEvent.click(await screen.findByText('Open deliverable'))
    expect(await screen.findByTestId('deliverable-preview-modal')).toHaveTextContent(
      'Launch document',
    )
    expect(screen.getByTestId('deliverable-preview-modal')).toHaveAttribute(
      'data-renderer',
      'function',
    )

    await act(async () => {
      ref.current?.openNewMissionCapture()
    })
    expect(await screen.findByTestId('mission-capture-input')).toHaveTextContent(
      'Tell me what to run...',
    )

    fireEvent.click(screen.getByText('Send mission'))
    await waitFor(() => {
      expect(mocks.createMission).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Run launch task',
          campaign_id: 'campaign-1',
          input: {
            attachments: [
              {
                name: 'brief.pdf',
                size: 0,
                type: undefined,
                url: 'https://cdn.example.com/brief.pdf',
              },
            ],
          },
        }),
      )
    })

    rerender(
      <MissionsView
        ref={ref}
        campaignId="campaign-1"
        campaignName="Launch Campaign"
        activeView={activeView}
        onViewPatch={mocks.onViewPatch}
        currentUserId="user-1"
        toolbarSearchQuery="launch"
      />,
    )

    await waitFor(() => {
      expect(consoleErrorSpy.mock.calls.flat().join('\n')).not.toContain('Maximum update depth')
    })
    consoleErrorSpy.mockRestore()
  })

  it('keeps the empty missions state stable', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.fetchMissions.mockResolvedValue([])

    renderMissionsView()

    expect(await screen.findByText('Start with the playbook')).toBeInTheDocument()
    expect(screen.getByText(/Webinar fulfillment is a guided mission/)).toBeInTheDocument()
    expect(consoleErrorSpy.mock.calls.flat().join('\n')).not.toContain('Maximum update depth')
    consoleErrorSpy.mockRestore()
  })

  it('loads missions filtered by the active space', async () => {
    renderMissionsView(React.createRef<MissionsViewHandle>(), activeView, undefined, 'space-v3')

    await screen.findByTestId('mission-list')
    expect(mocks.fetchMissions).toHaveBeenCalledWith({
      campaign_id: 'campaign-1',
      space_id: 'space-v3',
    })
  })

  it('keeps grouped mission list rendering stable', async () => {
    const groupedView = {
      ...activeView,
      missions_config: {
        visible_columns: ['title'],
        group_by: 'status',
      },
    } as unknown as ViewDef
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    renderMissionsView(React.createRef<MissionsViewHandle>(), groupedView)

    expect(await screen.findByText('Open')).toBeInTheDocument()
    expect(screen.getByText('Launch plan')).toBeInTheDocument()
    expect(consoleErrorSpy.mock.calls.flat().join('\n')).not.toContain('Maximum update depth')
    consoleErrorSpy.mockRestore()
  })
})
