import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mission } from '../../types'
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

  it('opens the mobile activity shell', () => {
    vi.stubGlobal('matchMedia', createMatchMedia(true))

    render(<MissionDetailModal mission={mission} onClose={vi.fn()} onUpdated={vi.fn()} />)

    fireEvent.click(screen.getByLabelText('Open timeline'))

    expect(screen.getAllByText('Activity')).toHaveLength(2)
    expect(screen.getByPlaceholderText('Send a message...')).toBeTruthy()
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

    const composer = screen.getByPlaceholderText('Send a message...')
    fireEvent.change(composer, { target: { value: 'Ship it' } })
    fireEvent.keyDown(composer, { key: 'Enter' })

    await waitFor(() => {
      expect(mocks.addMissionComment).toHaveBeenCalledWith(mission.id, 'Ship it', undefined)
    })
  })
})
