import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CampaignAddInfoPanel from './CampaignAddInfoPanel'

const mocks = vi.hoisted(() => ({
  enqueueCampaignKnowledgeFileImport: vi.fn(),
  importCampaignKnowledgeFromFathomMeeting: vi.fn(),
  importCampaignKnowledgeFromFirefliesTranscript: vi.fn(),
  importCampaignKnowledgeUrl: vi.fn(),
  listFathomMeetings: vi.fn(),
  listFirefliesTranscripts: vi.fn(),
  openDrive: vi.fn(),
  openDropbox: vi.fn(),
  setShowDrivePicker: vi.fn(),
  setShowDropboxPicker: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock('next/dynamic', () => ({
  default: () =>
    function DynamicAudioRecorderMock() {
      return <div data-testid="simple-chat-audio-recorder" />
    },
}))

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
  },
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

vi.mock('@/lib/hooks/use-cloud-attach', () => ({
  useCloudAttach: () => ({
    showDrivePicker: false,
    setShowDrivePicker: mocks.setShowDrivePicker,
    showDropboxPicker: false,
    setShowDropboxPicker: mocks.setShowDropboxPicker,
    openDrive: mocks.openDrive,
    openDropbox: mocks.openDropbox,
  }),
}))

vi.mock('@/lib/campaigns', () => ({
  enqueueCampaignKnowledgeFileImport: mocks.enqueueCampaignKnowledgeFileImport,
  importCampaignKnowledgeFromFathomMeeting: mocks.importCampaignKnowledgeFromFathomMeeting,
  importCampaignKnowledgeFromFirefliesTranscript:
    mocks.importCampaignKnowledgeFromFirefliesTranscript,
  importCampaignKnowledgeUrl: mocks.importCampaignKnowledgeUrl,
  KNOWLEDGE_DOMAINS: [
    { value: 'general', label: 'General' },
    { value: 'strategy', label: 'Strategy' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'finance', label: 'Finance' },
    { value: 'operations', label: 'Operations' },
    { value: 'creative', label: 'Creative' },
  ],
}))

vi.mock('../services/sk.service', () => ({
  extractDocumentTextWithAsset: vi.fn(),
}))

vi.mock('../services/user-brain-import.service', () => ({
  listFathomMeetings: mocks.listFathomMeetings,
  listFirefliesTranscripts: mocks.listFirefliesTranscripts,
}))

function renderPanel() {
  return render(
    <CampaignAddInfoPanel visible campaignId="campaign-1" onImported={vi.fn()} />,
  )
}

describe('CampaignAddInfoPanel call imports', () => {
  beforeEach(() => {
    mocks.enqueueCampaignKnowledgeFileImport.mockResolvedValue({
      success: true,
      jobId: 'job-file',
      status: 'queued',
    })
    mocks.importCampaignKnowledgeFromFathomMeeting.mockResolvedValue({
      success: true,
      jobId: 'job-fathom',
      status: 'queued',
    })
    mocks.importCampaignKnowledgeFromFirefliesTranscript.mockResolvedValue({
      success: true,
      jobId: 'job-fireflies',
      status: 'queued',
    })
    mocks.importCampaignKnowledgeUrl.mockResolvedValue({
      success: true,
      jobId: 'job-url',
      status: 'queued',
      deduped: false,
    })
    mocks.listFirefliesTranscripts.mockResolvedValue([])
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('loads all Fathom pages and queues selected campaign calls with the selected domain', async () => {
    const firstMeeting = {
      id: 'meeting-1',
      title: 'First Call',
      created_at: '2026-06-22T10:00:00.000Z',
    }
    const secondMeeting = {
      id: 'meeting-2',
      title: 'Second Call',
      created_at: '2026-06-23T10:00:00.000Z',
    }
    const thirdMeeting = {
      id: 'meeting-3',
      title: 'Third Call',
      created_at: '2026-06-24T10:00:00.000Z',
    }
    mocks.listFathomMeetings
      .mockResolvedValueOnce({ items: [firstMeeting], next_cursor: 'page-2' })
      .mockResolvedValueOnce({ items: [secondMeeting], next_cursor: 'page-3' })
      .mockResolvedValueOnce({ items: [thirdMeeting], next_cursor: undefined })

    renderPanel()

    fireEvent.click(screen.getByRole('button', { name: /add information/i }))
    fireEvent.click(screen.getByRole('button', { name: /auto \(ai\)/i }))
    fireEvent.click(await screen.findByRole('button', { name: 'Marketing' }))
    fireEvent.click(screen.getByRole('button', { name: /^import$/i }))
    fireEvent.click(await screen.findByRole('button', { name: /import from fathom/i }))

    expect(await screen.findByText('First Call')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /load all/i }))

    expect(await screen.findByText('Second Call')).toBeTruthy()
    expect(await screen.findByText('Third Call')).toBeTruthy()
    expect(mocks.listFathomMeetings).toHaveBeenNthCalledWith(2, 'page-2')
    expect(mocks.listFathomMeetings).toHaveBeenNthCalledWith(3, 'page-3')

    fireEvent.click(screen.getByRole('button', { name: /select all/i }))
    fireEvent.click(screen.getByRole('button', { name: /import 3 selected/i }))

    await waitFor(() => {
      expect(mocks.importCampaignKnowledgeFromFathomMeeting).toHaveBeenCalledTimes(3)
    })
    expect(mocks.importCampaignKnowledgeFromFathomMeeting).toHaveBeenCalledWith(
      'campaign-1',
      thirdMeeting,
      'marketing',
    )
    expect(mocks.importCampaignKnowledgeFromFathomMeeting).toHaveBeenCalledWith(
      'campaign-1',
      secondMeeting,
      'marketing',
    )
    expect(mocks.importCampaignKnowledgeFromFathomMeeting).toHaveBeenCalledWith(
      'campaign-1',
      firstMeeting,
      'marketing',
    )
    expect(mocks.toastSuccess).toHaveBeenCalledWith('3 import(s) queued.')
  })
})
