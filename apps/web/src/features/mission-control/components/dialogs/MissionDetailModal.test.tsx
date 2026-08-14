import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mission, MissionDeliverable, MissionSubtask } from '../../types'
import { MissionDetailModal } from './MissionDetailModal'

const mocks = vi.hoisted(() => ({
  useMissionDetailData: vi.fn(),
  fetchProfileSettings: vi.fn(),
  retryMission: vi.fn(),
  trashMission: vi.fn(),
  updateMission: vi.fn(),
  updateMissionStatus: vi.fn(),
  addMissionComment: vi.fn(),
  approveMissionAccessRequests: vi.fn(),
  approveMissionPlan: vi.fn(),
  rejectMissionPlan: vi.fn(),
  toggleAutoApprovePlans: vi.fn(),
  updateSubtask: vi.fn(),
  completeHumanSubtask: vi.fn(),
  openDrive: vi.fn(),
  openDropbox: vi.fn(),
  presignedUpload: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock('@/lib/hooks/use-cloud-attach', () => ({
  useCloudAttach: () => ({
    showDrivePicker: false,
    setShowDrivePicker: vi.fn(),
    showDropboxPicker: false,
    setShowDropboxPicker: vi.fn(),
    openDrive: mocks.openDrive,
    openDropbox: mocks.openDropbox,
  }),
}))

vi.mock('@/lib/hooks/use-presigned-upload', () => ({
  usePresignedUpload: () => ({ upload: mocks.presignedUpload }),
}))

vi.mock('@/components/deliverables/DeliverablePreviewModal', () => ({
  DeliverablePreviewModal: () => null,
}))

vi.mock('@/components/media/DriveFileBrowserModal', () => ({
  DriveFileBrowserModal: () => null,
}))

vi.mock('@/components/media/DropboxFileBrowserModal', () => ({
  DropboxFileBrowserModal: () => null,
}))

vi.mock('@/components/media/MediaPickerModal', () => ({
  MediaPickerModal: () => null,
}))

vi.mock('../../hooks/useMissionDetailData', () => ({
  useMissionDetailData: mocks.useMissionDetailData,
}))

vi.mock('../../services/missions.service', () => ({
  addMissionComment: mocks.addMissionComment,
  approveMissionAccessRequests: mocks.approveMissionAccessRequests,
  approveMissionPlan: mocks.approveMissionPlan,
  fetchProfileSettings: mocks.fetchProfileSettings,
  rejectMissionPlan: mocks.rejectMissionPlan,
  retryMission: mocks.retryMission,
  toggleAutoApprovePlans: mocks.toggleAutoApprovePlans,
  trashMission: mocks.trashMission,
  updateMission: mocks.updateMission,
  updateMissionStatus: mocks.updateMissionStatus,
  updateSubtask: mocks.updateSubtask,
}))

vi.mock('../../services/mission-human-subtasks.service', () => ({
  completeHumanSubtask: mocks.completeHumanSubtask,
}))

function createMatchMedia(matches: boolean) {
  return vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

const mission: Mission = {
  id: 'mission-1',
  user_id: 'user-1',
  parent_mission_id: null,
  campaign_id: 'campaign-1',
  title: 'Launch Mission',
  brief: 'Coordinate launch work',
  description: null,
  status: 'todo',
  priority: 'high',
  assigned_agent_key: null,
  current_agent_key: null,
  progress_notes: null,
  plan_id: null,
  correlation_id: 'corr-1',
  idempotency_key: 'idem-1',
  retry_count: 0,
  input: {},
  output: {},
  error: null,
  scheduled_at: null,
  created_at: '2026-06-22T00:00:00.000Z',
  updated_at: '2026-06-22T00:00:00.000Z',
  started_at: null,
  completed_at: null,
}

const subtask: MissionSubtask = {
  id: 'subtask-1',
  mission_id: mission.id,
  user_id: mission.user_id,
  title: 'Draft launch copy',
  status: 'done',
  assigned_agent_key: null,
  assignee_type: 'agent',
  assigned_user_id: null,
  awaiting_human_since: null,
  sla_escalate_at: null,
  sla_escalated_at: null,
  bounce_reason: null,
  sort_order: 0,
  depends_on: [],
  output: { content: 'Finished copy' },
  feedback: null,
  deliverable_id: 'deliverable-1',
  scheduled_at: null,
  created_at: mission.created_at,
  updated_at: mission.updated_at,
}

const deliverable = {
  id: 'deliverable-1',
  mission_id: mission.id,
  campaign_id: mission.campaign_id,
  user_id: mission.user_id,
  agent_key: 'atlas',
  type: 'pdf',
  title: 'Launch copy',
  content: 'Launch copy body',
  file_url: null,
  file_name: null,
  file_size: null,
  mime_type: null,
  metadata: {},
  created_at: mission.created_at,
} satisfies MissionDeliverable

const humanGate: MissionSubtask = {
  ...subtask,
  id: 'gate-1',
  title: 'Gate 1 — approve strategy package',
  status: 'awaiting_human',
  assignee_type: 'human',
  assigned_user_id: mission.user_id,
  depends_on: [subtask.id],
  output: {},
  deliverable_id: null,
  intent: {
    why: 'Human approval is required before production starts.',
    story: 'Review the strategy package and request revisions if anything is wrong.',
    sensory: 'The package is clear and ready for production.',
    endState: 'Gate 1 is completed and market research starts.',
    ecology: 'Use feedback for revisions and approve only when the package is ready.',
  },
}

function mockDetailData() {
  mocks.useMissionDetailData.mockReturnValue({
    prd: null,
    prdLoading: false,
    liveMission: null,
    missionLogs: [],
    deliverables: [],
    accessRequests: [],
    logsLoading: false,
    subtasks: [],
    agents: [],
    userProfile: { fullName: 'You', avatarUrl: null },
    setMissionLogs: vi.fn(),
    setSubtasks: vi.fn(),
    setAccessRequests: vi.fn(),
  })
  mocks.fetchProfileSettings.mockResolvedValue({
    preferred_channel: 'email',
    daily_digest_enabled: false,
    daily_digest_time: '09:00',
    awareness_loop_enabled: false,
    auto_approve_plans: false,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockDetailData()
  vi.stubGlobal('matchMedia', createMatchMedia(false))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('MissionDetailModal', () => {
  it('renders the desktop detail shell and closes on Escape', () => {
    const onClose = vi.fn()

    render(<MissionDetailModal mission={mission} onClose={onClose} onUpdated={vi.fn()} />)

    expect(screen.getByDisplayValue('Launch Mission')).toBeTruthy()
    expect(screen.getByText('Execution Plan')).toBeTruthy()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders shell-owned actions in the Mission header', () => {
    render(
      <MissionDetailModal
        mission={mission}
        presentation="panel"
        headerActions={<button type="button">Expand mission viewer</button>}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Expand mission viewer' })).toBeTruthy()
  })

  it('opens a subtask in the full detail shell and navigates back to the mission', () => {
    mocks.useMissionDetailData.mockReturnValue({
      ...mocks.useMissionDetailData(),
      subtasks: [subtask],
      deliverables: [deliverable],
    })

    render(
      <MissionDetailModal
        mission={mission}
        presentation="panel"
        initialSubtaskId={subtask.id}
        headerActions={<button type="button">Expand mission viewer</button>}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Draft launch copy' })).toBeTruthy()
    expect(screen.getByText('Finished copy')).toBeTruthy()
    expect(screen.getByText('Task 1 — Launch copy')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Expand mission viewer' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Launch Mission' }))

    expect(screen.getByDisplayValue('Launch Mission')).toBeTruthy()
  })

  it('shows a human gate workspace and approves it to continue the mission', async () => {
    mocks.completeHumanSubtask.mockResolvedValue({ ok: true, deliverable_id: 'approval-1' })
    mocks.useMissionDetailData.mockReturnValue({
      ...mocks.useMissionDetailData(),
      subtasks: [subtask, humanGate],
      deliverables: [deliverable],
    })

    render(
      <MissionDetailModal
        mission={{ ...mission, status: 'awaiting_human' }}
        initialSubtaskId={humanGate.id}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    )

    expect(screen.getByText('Your approval is needed')).toBeTruthy()
    expect(screen.getByText('Draft launch copy')).toBeTruthy()
    expect(screen.getByText('Task 1 — Launch copy')).toBeTruthy()
    expect(screen.getByText('Gate 1 is completed and market research starts.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Approve & continue' }))

    await waitFor(() => {
      expect(mocks.completeHumanSubtask).toHaveBeenCalledWith(mission.id, humanGate.id, {
        summary: 'Approved Gate 1 — approve strategy package. Ready to continue.',
      })
    })
  })

  it('sends requested gate changes as scoped guidance without closing the gate', async () => {
    mocks.addMissionComment.mockResolvedValue({
      id: 'feedback-log',
      mission_id: mission.id,
      user_id: mission.user_id,
      event_type: 'user.comment',
      from_status: null,
      to_status: null,
      agent_key: null,
      correlation_id: null,
      payload: { message: 'Revise the pricing section.' },
      created_at: new Date().toISOString(),
    })
    mocks.useMissionDetailData.mockReturnValue({
      ...mocks.useMissionDetailData(),
      subtasks: [subtask, humanGate],
      deliverables: [deliverable],
    })

    render(
      <MissionDetailModal
        mission={{ ...mission, status: 'awaiting_human' }}
        initialSubtaskId={humanGate.id}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText('Message Pixel...'), {
      target: { value: 'Revise the pricing section.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Request changes' }))

    await waitFor(() => {
      expect(mocks.addMissionComment).toHaveBeenCalledWith(
        mission.id,
        `Guidance for subtask "${humanGate.title}" (${humanGate.id}):\nRevise the pricing section.`,
      )
      expect(mocks.completeHumanSubtask).not.toHaveBeenCalled()
    })
  })

  it('opens the mobile activity shell', () => {
    vi.stubGlobal('matchMedia', createMatchMedia(true))

    render(<MissionDetailModal mission={mission} onClose={vi.fn()} onUpdated={vi.fn()} />)

    fireEvent.click(screen.getByLabelText('Open timeline'))

    expect(screen.getAllByText('Activity')).toHaveLength(2)
    expect(screen.getByPlaceholderText('Message Pixel...')).toBeTruthy()
  })

  it('sends a text comment from the activity composer', async () => {
    mocks.addMissionComment.mockResolvedValue({
      id: 'log-1',
      mission_id: mission.id,
      user_id: mission.user_id,
      event_type: 'user.comment',
      from_status: null,
      to_status: null,
      agent_key: null,
      correlation_id: null,
      payload: { message: 'Ship it' },
      created_at: new Date().toISOString(),
    })

    render(<MissionDetailModal mission={mission} onClose={vi.fn()} onUpdated={vi.fn()} />)

    const composer = screen.getByPlaceholderText('Message Pixel...')
    fireEvent.change(composer, { target: { value: 'Ship it' } })
    fireEvent.keyDown(composer, { key: 'Enter' })

    await waitFor(() => {
      expect(mocks.addMissionComment).toHaveBeenCalledWith(mission.id, 'Ship it', undefined)
    })
  })
})
