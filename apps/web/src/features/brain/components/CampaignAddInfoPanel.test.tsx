import { Profiler } from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
    function DynamicAudioRecorderMock(props: { isRecording?: boolean }) {
      return (
        <div
          data-recording={String(Boolean(props.isRecording))}
          data-testid="simple-chat-audio-recorder"
        />
      )
    },
}))

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
  },
}))

vi.mock('@/components/media/DriveFileBrowserModal', () => ({
  DriveFileBrowserModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="drive-file-browser-modal">Drive files</div> : null,
}))

vi.mock('@/components/media/DropboxFileBrowserModal', () => ({
  DropboxFileBrowserModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="dropbox-file-browser-modal">Dropbox files</div> : null,
}))

vi.mock('@/components/media/MediaPickerModal', () => ({
  MediaPickerModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="media-picker-modal">Media library</div> : null,
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

function renderCampaignAddInfoPanel(
  options: {
    campaignId?: string | null
    onImported?: () => void | Promise<void>
    onRender?: () => void
    visible?: boolean
  } = {},
) {
  return render(
    <Profiler id="CampaignAddInfoPanel" onRender={options.onRender ?? vi.fn()}>
      <CampaignAddInfoPanel
        visible={options.visible ?? true}
        campaignId={options.campaignId ?? 'campaign-1'}
        onImported={options.onImported ?? vi.fn()}
      />
    </Profiler>,
  )
}

function firstEnabledTrainButton() {
  const buttons = screen.getAllByRole('button', { name: /^Train$/i })
  const enabled = buttons.find((button) => !button.hasAttribute('disabled'))
  expect(enabled).toBeTruthy()
  return enabled!
}

function selectTab(name: string) {
  const tab = screen.getByRole('tab', { name })
  fireEvent.mouseDown(tab, { button: 0, ctrlKey: false })
  fireEvent.click(tab)
}

describe('CampaignAddInfoPanel', () => {
  beforeEach(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:campaign-image-preview'),
    })
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
    mocks.listFathomMeetings.mockResolvedValue({
      items: [],
      next_cursor: undefined,
    })
    mocks.listFirefliesTranscripts.mockResolvedValue([])
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('queues manual text for the selected campaign without render churn', async () => {
    const onImported = vi.fn()
    const onRender = vi.fn()

    renderCampaignAddInfoPanel({ onImported, onRender })

    fireEvent.click(screen.getByRole('button', { name: /add information/i }))
    fireEvent.change(screen.getByPlaceholderText(/source title/i), {
      target: { value: 'Launch Notes' },
    })
    fireEvent.change(screen.getByPlaceholderText(/paste the knowledge content/i), {
      target: { value: 'Existing launch knowledge.' },
    })
    fireEvent.click(firstEnabledTrainButton())

    await waitFor(() => {
      expect(mocks.enqueueCampaignKnowledgeFileImport).toHaveBeenCalledWith({
        campaignId: 'campaign-1',
        title: 'Launch Notes',
        content: 'Existing launch knowledge.',
        sourceType: 'upload',
        domain: undefined,
      })
    })
    expect(onImported).toHaveBeenCalledTimes(1)
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Text added.')
    expect(onRender.mock.calls.length).toBeLessThan(24)
  })

  it('queues manual text with the selected knowledge domain', async () => {
    renderCampaignAddInfoPanel()

    fireEvent.click(screen.getByRole('button', { name: /add information/i }))
    fireEvent.click(screen.getByRole('button', { name: /auto \(ai\)/i }))
    fireEvent.click(await screen.findByRole('button', { name: 'Strategy' }))
    fireEvent.change(screen.getByPlaceholderText(/source title/i), {
      target: { value: 'Strategy Notes' },
    })
    fireEvent.change(screen.getByPlaceholderText(/paste the knowledge content/i), {
      target: { value: 'Positioning and launch priorities.' },
    })
    fireEvent.click(firstEnabledTrainButton())

    await waitFor(() => {
      expect(mocks.enqueueCampaignKnowledgeFileImport).toHaveBeenCalledWith({
        campaignId: 'campaign-1',
        title: 'Strategy Notes',
        content: 'Positioning and launch priorities.',
        sourceType: 'upload',
        domain: 'strategy',
      })
    })
  })

  it('detects supported links and queues the URL import', async () => {
    const onImported = vi.fn()
    const onRender = vi.fn()

    renderCampaignAddInfoPanel({ onImported, onRender })

    fireEvent.click(screen.getByRole('button', { name: /add information/i }))
    selectTab('Link')
    fireEvent.change(screen.getByPlaceholderText(/paste url/i), {
      target: { value: 'https://www.youtube.com/watch?v=abc' },
    })

    expect(screen.getByText(/YouTube link detected/i)).toBeTruthy()

    fireEvent.click(firstEnabledTrainButton())

    await waitFor(() => {
      expect(mocks.importCampaignKnowledgeUrl).toHaveBeenCalledWith(
        'campaign-1',
        'https://www.youtube.com/watch?v=abc',
        undefined,
      )
    })
    expect(onImported).toHaveBeenCalledTimes(1)
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Link imported.')
    expect(onRender.mock.calls.length).toBeLessThan(24)
  })

  it('queues image uploads with caption metadata', async () => {
    const onImported = vi.fn()
    const { container } = renderCampaignAddInfoPanel({ onImported })
    const file = new File(['image-bytes'], 'launch-visual.png', { type: 'image/png' })

    fireEvent.click(screen.getByRole('button', { name: /add information/i }))
    selectTab('Image')

    const imageInput = container.querySelector('input[accept="image/*"]') as HTMLInputElement | null
    expect(imageInput).toBeTruthy()
    fireEvent.change(imageInput!, { target: { files: [file] } })

    expect(await screen.findByAltText('Preview')).toBeTruthy()

    fireEvent.change(screen.getByPlaceholderText(/optional caption/i), {
      target: { value: 'Hero image' },
    })
    fireEvent.click(screen.getByRole('button', { name: /embed image/i }))

    await waitFor(() => {
      expect(mocks.enqueueCampaignKnowledgeFileImport).toHaveBeenCalledWith(
        expect.objectContaining({
          campaignId: 'campaign-1',
          title: 'launch-visual',
          content: 'Hero image',
          sourceType: 'upload',
          domain: undefined,
          mediaType: 'image',
          mediaMimeType: 'image/png',
          mediaCaption: 'Hero image',
        }),
      )
    })
    expect(mocks.enqueueCampaignKnowledgeFileImport.mock.calls[0]?.[0].mediaBase64).toBeTruthy()
    expect(onImported).toHaveBeenCalledTimes(1)
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Image import started.')
  })

  it('queues local text files from the import input', async () => {
    const { container } = renderCampaignAddInfoPanel()
    const file = new File(['Campaign file knowledge.'], 'campaign-notes.txt', { type: 'text/plain' })
    Object.defineProperty(file, 'text', {
      value: vi.fn().mockResolvedValue('Campaign file knowledge.'),
    })
    fireEvent.click(screen.getByRole('button', { name: /add information/i }))
    fireEvent.click(screen.getByRole('button', { name: /^import$/i }))
    fireEvent.click(await screen.findByRole('button', { name: /upload from local/i }))
    const fileInput = container.querySelector('input[accept^=".txt"]') as HTMLInputElement | null
    expect(fileInput).toBeTruthy()
    fireEvent.change(fileInput!, { target: { files: [file] } })
    await waitFor(() => {
      expect(mocks.enqueueCampaignKnowledgeFileImport).toHaveBeenCalledWith(
        expect.objectContaining({
          campaignId: 'campaign-1',
          title: 'campaign-notes',
          content: 'Campaign file knowledge.',
          sourceType: 'upload',
          domain: undefined,
          mediaType: 'text',
          mediaMimeType: 'text/plain',
        }),
      )
    })
    expect(mocks.enqueueCampaignKnowledgeFileImport.mock.calls[0]?.[0].mediaBase64).toBeTruthy()
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Import started. You can keep working.')
  })

  it('routes import menu actions to cloud providers and media library', async () => {
    renderCampaignAddInfoPanel()

    fireEvent.click(screen.getByRole('button', { name: /add information/i }))
    fireEvent.click(screen.getByRole('button', { name: /^import$/i }))
    fireEvent.click(await screen.findByRole('button', { name: /add from google drive/i }))

    expect(mocks.openDrive).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /^import$/i }))
    fireEvent.click(await screen.findByRole('button', { name: /add from dropbox/i }))

    expect(mocks.openDropbox).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /^import$/i }))
    fireEvent.click(await screen.findByRole('button', { name: /import from media library/i }))

    expect(await screen.findByTestId('media-picker-modal')).toBeTruthy()
  })

  it('loads Fathom meetings and queues selected calls for campaign import', async () => {
    const newerMeeting = {
      id: 'meeting-new',
      title: 'Newer Call',
      created_at: '2026-06-24T10:00:00.000Z',
    }
    const olderMeeting = {
      id: 'meeting-old',
      title: 'Older Call',
      created_at: '2026-06-23T10:00:00.000Z',
    }
    mocks.listFathomMeetings.mockResolvedValue({
      items: [olderMeeting, newerMeeting],
      next_cursor: undefined,
    })

    renderCampaignAddInfoPanel()

    fireEvent.click(screen.getByRole('button', { name: /add information/i }))
    fireEvent.click(screen.getByRole('button', { name: /import/i }))
    fireEvent.click(await screen.findByRole('button', { name: /import from fathom/i }))

    expect(await screen.findByText('Newer Call')).toBeTruthy()
    expect(screen.getByText('Older Call')).toBeTruthy()

    fireEvent.click(screen.getByText('Newer Call'))
    fireEvent.click(screen.getByRole('button', { name: /import 1 selected/i }))

    await waitFor(() => {
      expect(mocks.importCampaignKnowledgeFromFathomMeeting).toHaveBeenCalledWith(
        'campaign-1',
        newerMeeting,
        undefined,
      )
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith('1 import(s) queued.')
  })

  it('loads Fireflies transcripts and queues a transcript for campaign import', async () => {
    const transcript = {
      id: 'transcript-1',
      title: 'Fireflies Call',
      date: 1782288000,
    }
    mocks.listFirefliesTranscripts.mockResolvedValue([transcript])

    renderCampaignAddInfoPanel()

    fireEvent.click(screen.getByRole('button', { name: /add information/i }))
    fireEvent.click(screen.getByRole('button', { name: /^import$/i }))
    fireEvent.click(await screen.findByRole('button', { name: /import from fireflies/i }))

    expect(await screen.findByText('Fireflies Call')).toBeTruthy()
    expect(mocks.listFirefliesTranscripts).toHaveBeenCalledWith(30)

    const transcriptRow = screen.getByText('Fireflies Call').closest('div')?.parentElement
    expect(transcriptRow).toBeTruthy()
    fireEvent.click(within(transcriptRow as HTMLElement).getByRole('button', { name: /^import$/i }))

    await waitFor(() => {
      expect(mocks.importCampaignKnowledgeFromFirefliesTranscript).toHaveBeenCalledWith(
        'campaign-1',
        'transcript-1',
        undefined,
      )
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Import started. You can keep working.')
  })
})
