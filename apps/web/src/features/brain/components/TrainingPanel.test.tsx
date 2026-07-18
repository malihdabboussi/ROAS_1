import { Profiler } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TrainingPanel from './TrainingPanel'

const mocks = vi.hoisted(() => ({
  enqueueSkIngest: vi.fn(),
  enqueueSkLinkIngest: vi.fn(),
  extractDocumentTextWithAsset: vi.fn(),
  fetchSkSources: vi.fn(),
  fetchSkStats: vi.fn(),
  getFathomStatus: vi.fn(),
  getFirefliesStatus: vi.fn(),
  importFathomMeeting: vi.fn(),
  importFirefliesTranscript: vi.fn(),
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

vi.mock('../services/sk.service', () => ({
  extractDocumentTextWithAsset: mocks.extractDocumentTextWithAsset,
  fetchSkSources: mocks.fetchSkSources,
  fetchSkStats: mocks.fetchSkStats,
}))

vi.mock('../services/user-brain-import.service', () => ({
  enqueueSkIngest: mocks.enqueueSkIngest,
  enqueueSkLinkIngest: mocks.enqueueSkLinkIngest,
  getFathomStatus: mocks.getFathomStatus,
  getFirefliesStatus: mocks.getFirefliesStatus,
  importFathomMeeting: mocks.importFathomMeeting,
  importFirefliesTranscript: mocks.importFirefliesTranscript,
  listFathomMeetings: mocks.listFathomMeetings,
  listFirefliesTranscripts: mocks.listFirefliesTranscripts,
}))

function renderTrainingPanel(options: { onRender?: () => void } = {}) {
  return render(
    <Profiler id="TrainingPanel" onRender={options.onRender ?? vi.fn()}>
      <TrainingPanel brainId="brain-agent" isAgentBrain agentName="Maya" />
    </Profiler>,
  )
}

function openPanel() {
  fireEvent.click(screen.getByRole('button', { name: /train maya/i }))
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

describe('TrainingPanel', () => {
  beforeEach(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:training-panel-image-preview'),
    })
    mocks.fetchSkSources.mockResolvedValue([])
    mocks.fetchSkStats.mockResolvedValue({
      totalEntries: 3,
      avgMastery: 0,
      domainBreakdown: {},
    })
    mocks.getFathomStatus.mockResolvedValue({ connected: false })
    mocks.getFirefliesStatus.mockResolvedValue({ connected: false })
    mocks.listFathomMeetings.mockResolvedValue({ items: [], next_cursor: undefined })
    mocks.listFirefliesTranscripts.mockResolvedValue([])
    mocks.enqueueSkIngest.mockResolvedValue({ success: true, jobId: 'job-text', status: 'queued' })
    mocks.enqueueSkLinkIngest.mockResolvedValue({
      success: true,
      jobId: 'job-link',
      status: 'queued',
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('mounts and queues manual text without render churn', async () => {
    const onRender = vi.fn()
    renderTrainingPanel({ onRender })

    openPanel()

    await waitFor(() => {
      expect(screen.getByText('3 entries')).toBeTruthy()
    })

    fireEvent.change(screen.getByPlaceholderText(/source title/i), {
      target: { value: 'Launch Notes' },
    })
    fireEvent.change(screen.getByPlaceholderText(/paste the knowledge content/i), {
      target: { value: 'Existing launch knowledge.' },
    })
    fireEvent.click(firstEnabledTrainButton())

    await waitFor(() => {
      expect(mocks.enqueueSkIngest).toHaveBeenCalledWith({
        brainId: 'brain-agent',
        text: 'Existing launch knowledge.',
        sourceType: 'notes',
        title: 'Launch Notes',
        domain: 'general',
      })
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Added to processing queue')
    expect(onRender.mock.calls.length).toBeLessThan(24)
  })

  it('detects supported links and queues link ingestion', async () => {
    renderTrainingPanel()

    openPanel()
    selectTab('Link')
    fireEvent.change(screen.getByPlaceholderText(/paste url/i), {
      target: { value: 'https://www.youtube.com/watch?v=abc' },
    })

    expect(screen.getByText(/YouTube link detected/i)).toBeTruthy()

    fireEvent.click(firstEnabledTrainButton())

    await waitFor(() => {
      expect(mocks.enqueueSkLinkIngest).toHaveBeenCalledWith({
        brainId: 'brain-agent',
        url: 'https://www.youtube.com/watch?v=abc',
        sourceType: 'transcript',
        title: 'YouTube: youtube.com/watch?v=abc',
        domain: 'general',
      })
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Added to processing queue')
  })

  it('routes import menu actions to cloud and media library surfaces', async () => {
    renderTrainingPanel()

    openPanel()

    fireEvent.click(screen.getByRole('button', { name: /^Import$/i }))
    fireEvent.click(screen.getByRole('button', { name: /add from google drive/i }))

    expect(mocks.openDrive).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /^Import$/i }))
    fireEvent.click(screen.getByRole('button', { name: /add from dropbox/i }))

    expect(mocks.openDropbox).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /^Import$/i }))
    fireEvent.click(screen.getByRole('button', { name: /import from media library/i }))

    expect(await screen.findByTestId('media-picker-modal')).toBeTruthy()
  })

  it('loads Fathom calls and imports selected meetings for the agent brain', async () => {
    const meeting = {
      id: 'meeting-1',
      title: 'Pipeline Review',
      created_at: '2026-06-24T10:00:00.000Z',
    }
    mocks.getFathomStatus.mockResolvedValue({ connected: true })
    mocks.listFathomMeetings.mockResolvedValue({ items: [meeting], next_cursor: undefined })
    mocks.importFathomMeeting.mockResolvedValue({
      success: true,
      jobId: 'job-fathom',
      status: 'queued',
    })
    renderTrainingPanel()

    openPanel()

    fireEvent.click(screen.getByRole('button', { name: /^Import$/i }))
    fireEvent.click(await screen.findByRole('button', { name: /import from fathom/i }))

    const meetingButton = await screen.findByRole('button', { name: /Pipeline Review/ })
    expect(meetingButton.getAttribute('aria-pressed')).toBe('false')
    const fathomDialog = screen.getByRole('dialog', { name: 'Import Fathom Calls' })
    expect(fathomDialog.getAttribute('aria-describedby')).toBe(
      screen.getByText(/Select calls to import/).id,
    )
    expect(screen.getByRole('button', { name: 'Close Fathom calls' })).toBeTruthy()
    expect(mocks.listFathomMeetings).toHaveBeenCalledWith()

    fireEvent.click(meetingButton)
    expect(meetingButton.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: /import 1 selected/i }))

    await waitFor(() => {
      expect(mocks.importFathomMeeting).toHaveBeenCalledWith(meeting, {
        brainId: 'brain-agent',
        targetBrain: 'agent',
      })
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith('1 import(s) queued.')
  })

  it('loads Fireflies calls and imports a transcript for the agent brain', async () => {
    const transcript = {
      id: 'transcript-1',
      title: 'Customer Discovery',
      date: 1782295200,
    }
    mocks.getFirefliesStatus.mockResolvedValue({ connected: true })
    mocks.listFirefliesTranscripts.mockResolvedValue([transcript])
    mocks.importFirefliesTranscript.mockResolvedValue({
      success: true,
      jobId: 'job-fireflies',
      status: 'queued',
    })
    renderTrainingPanel()

    openPanel()

    fireEvent.click(screen.getByRole('button', { name: /^Import$/i }))
    fireEvent.click(await screen.findByRole('button', { name: /import from fireflies/i }))

    expect(await screen.findByText('Customer Discovery')).toBeTruthy()
    const firefliesDialog = screen.getByRole('dialog', { name: 'Import Fireflies Calls' })
    expect(firefliesDialog.getAttribute('aria-describedby')).toBe(
      screen.getByText(/One click import/).id,
    )
    expect(screen.getByRole('button', { name: 'Close Fireflies calls' })).toBeTruthy()
    expect(mocks.listFirefliesTranscripts).toHaveBeenCalledWith(30)

    fireEvent.click(screen.getByRole('button', { name: /^Import$/i }))

    await waitFor(() => {
      expect(mocks.importFirefliesTranscript).toHaveBeenCalledWith('transcript-1', {
        brainId: 'brain-agent',
        targetBrain: 'agent',
      })
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Import started. You can keep working.')
  })

  it('queues local text files from the import input', async () => {
    const { container } = renderTrainingPanel()
    const file = new File(['Panel file knowledge.'], 'panel-notes.txt', { type: 'text/plain' })
    Object.defineProperty(file, 'text', {
      configurable: true,
      value: vi.fn().mockResolvedValue('Panel file knowledge.'),
    })

    openPanel()

    const fileInput = container.querySelector('input[accept*=".txt"]') as HTMLInputElement | null
    expect(fileInput).toBeTruthy()
    fireEvent.change(fileInput!, { target: { files: [file] } })

    await waitFor(() => {
      expect(mocks.enqueueSkIngest).toHaveBeenCalledWith(
        expect.objectContaining({
          brainId: 'brain-agent',
          text: 'Panel file knowledge.',
          sourceType: 'notes',
          title: 'File: panel-notes',
          domain: 'general',
          mediaType: 'text',
          mediaMimeType: 'text/plain',
          assetId: null,
          assetRef: null,
        }),
      )
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith('"panel-notes" added to processing queue')
  })

  it('enables image ingestion after selecting an image file', async () => {
    const { container } = renderTrainingPanel()
    const file = new File(['image-bytes'], 'launch-visual.png', { type: 'image/png' })

    openPanel()
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
      expect(mocks.enqueueSkIngest).toHaveBeenCalledWith({
        brainId: 'brain-agent',
        text: 'Hero image',
        sourceType: 'notes',
        title: 'Image: launch-visual',
        domain: 'general',
        mediaType: 'image',
        mediaMimeType: 'image/png',
        mediaCaption: 'Hero image',
      })
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Added to processing queue')
  })
})
