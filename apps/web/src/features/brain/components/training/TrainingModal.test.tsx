import { Profiler } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TrainableBrainTarget } from '@/features/brain/hooks/use-trainable-brains'
import type { SkSource } from '../../services/sk.service'
import TrainingModal from './TrainingModal'

const mocks = vi.hoisted(() => ({
  enqueueSkIngest: vi.fn(),
  enqueueSkLinkIngest: vi.fn(),
  extractDocumentTextWithAsset: vi.fn(),
  fetchSkSources: vi.fn(),
  listMeetingProviders: vi.fn(),
  importFathomMeeting: vi.fn(),
  importFirefliesTranscript: vi.fn(),
  listFathomMeetings: vi.fn(),
  listFirefliesTranscripts: vi.fn(),
  openWorkspaceSettings: vi.fn(),
  refreshConnectionStatus: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock('@/components/media/DriveFileBrowserPanel', () => ({
  DriveFileBrowserPanel: ({ open }: { open: boolean }) => (
    <div data-open={String(open)} data-testid="drive-browser-panel">
      Google Drive browser
    </div>
  ),
}))

vi.mock('@/components/media/DropboxFileBrowserModal', () => ({
  DropboxFileBrowserModal: ({ open }: { open: boolean }) => (
    <div data-open={String(open)} data-testid="dropbox-browser-panel">
      Dropbox browser
    </div>
  ),
}))

vi.mock('@/components/media/MediaPickerModal', () => ({
  MediaPickerModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="media-picker-modal">Media library</div> : null,
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/lib/hooks/use-cloud-attach', () => ({
  useCloudAttach: () => ({
    driveConnected: true,
    dropboxConnected: false,
    refreshConnectionStatus: mocks.refreshConnectionStatus,
  }),
}))

vi.mock('@/lib/settings', () => ({
  useWorkspaceSettingsModal: () => ({
    openWorkspaceSettings: mocks.openWorkspaceSettings,
  }),
}))

vi.mock('../../services/sk.service', () => ({
  extractDocumentTextWithAsset: mocks.extractDocumentTextWithAsset,
  fetchSkSources: mocks.fetchSkSources,
}))

vi.mock('../../services/user-brain-import.service', () => ({
  enqueueSkIngest: mocks.enqueueSkIngest,
  enqueueSkLinkIngest: mocks.enqueueSkLinkIngest,
  listMeetingProviders: mocks.listMeetingProviders,
  importFathomMeeting: mocks.importFathomMeeting,
  importFirefliesTranscript: mocks.importFirefliesTranscript,
  listFathomMeetings: mocks.listFathomMeetings,
  listFirefliesTranscripts: mocks.listFirefliesTranscripts,
}))

class ResizeObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

function target(overrides: Partial<TrainableBrainTarget> = {}): TrainableBrainTarget {
  return {
    scopeId: 'scope-user',
    label: 'Your Brain',
    brainId: 'brain-user',
    scopeType: 'user',
    isAgentBrain: false,
    imageUrl: null,
    ...overrides,
  }
}

function skSource(overrides: Partial<SkSource> = {}): SkSource {
  return {
    id: 'source-1',
    brain_id: 'brain-user',
    source_type: 'website',
    title: 'Existing source',
    author: null,
    url: 'https://example.com/learn',
    metadata: {},
    status: 'ready',
    entries_count: 1,
    domain: 'general',
    tags: [],
    ingested_at: null,
    created_at: '2026-06-24T00:00:00.000Z',
    ...overrides,
  }
}

function renderTrainingModal(
  options: {
    onOpenChange?: (open: boolean) => void
    onRender?: () => void
  } = {},
) {
  return render(
    <Profiler id="TrainingModal" onRender={options.onRender ?? vi.fn()}>
      <TrainingModal
        brainId="brain-user"
        isAgentBrain={false}
        open
        onOpenChange={options.onOpenChange ?? vi.fn()}
        triggerless
        trainableTargets={[
          target(),
          target({
            scopeId: 'scope-agent',
            label: 'Maya',
            brainId: 'brain-agent',
            scopeType: 'agent',
            isAgentBrain: true,
            agentName: 'Maya',
          }),
        ]}
        selectedScopeIds={['scope-user']}
        onSelectedScopeIdsChange={vi.fn()}
      />
    </Profiler>,
  )
}

describe('TrainingModal', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
    mocks.fetchSkSources.mockResolvedValue([])
    mocks.refreshConnectionStatus.mockResolvedValue(undefined)
    mocks.listMeetingProviders.mockResolvedValue([
      { id: 'fathom', connected: true, listRecent: true },
      { id: 'fireflies', connected: false, listRecent: true },
      { id: 'read_ai', connected: true, listRecent: false },
    ])
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
    vi.unstubAllGlobals()
  })

  it('mounts with connected integration sources and switches to Drive without render churn', async () => {
    const onRender = vi.fn()

    renderTrainingModal({ onRender })

    expect(screen.getByText('TRAIN BRAIN')).toBeTruthy()
    const dialog = screen.getByRole('dialog', { name: 'Train brain' })
    expect(dialog.getAttribute('aria-describedby')).toBe(
      screen.getByText(/Add one-time or recurring knowledge sources/).id,
    )
    expect(screen.getByRole('button', { name: 'Close training' })).toBeTruthy()
    expect(screen.getByText('Train which brains')).toBeTruthy()
    expect(screen.getByText('Staging (0)')).toBeTruthy()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /google drive/i })).toBeTruthy()
    })

    expect(screen.getByRole('button', { name: /fathom/i })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /dropbox/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /fireflies/i })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /google drive/i }))
    expect(screen.getByTestId('drive-browser-panel').getAttribute('data-open')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: /add more/i }))
    expect(mocks.openWorkspaceSettings).toHaveBeenCalledWith('integrations')
    expect(onRender.mock.calls.length).toBeLessThan(12)
  })

  it('stages pasted links and text notes before queue dispatch', async () => {
    renderTrainingModal()

    const textarea = screen.getByPlaceholderText(/Paste text, links, or notes here/i)
    fireEvent.change(textarea, {
      target: {
        value: 'https://example.com/learn\nLaunch research notes',
      },
    })
    fireEvent.click(screen.getByRole('button', { name: /add to staging/i }))

    expect(screen.getByText('Staging (2)')).toBeTruthy()
    expect(screen.getByText('example.com/learn')).toBeTruthy()
    expect(screen.getByText('Launch research notes')).toBeTruthy()
    expect(screen.getByRole('button', { name: /add 2 to queue/i })).toBeTruthy()
  })

  it('dispatches staged links and text notes to the selected brain queue', async () => {
    const onOpenChange = vi.fn()
    renderTrainingModal({ onOpenChange })

    const textarea = screen.getByPlaceholderText(/Paste text, links, or notes here/i)
    fireEvent.change(textarea, {
      target: {
        value: 'https://example.com/learn\nLaunch research notes',
      },
    })
    fireEvent.click(screen.getByRole('button', { name: /add to staging/i }))

    fireEvent.click(screen.getByRole('button', { name: /add 2 to queue/i }))

    await waitFor(() => {
      expect(mocks.enqueueSkLinkIngest).toHaveBeenCalledWith({
        brainId: 'brain-user',
        url: 'https://example.com/learn',
        sourceType: 'website',
        title: 'example.com/learn',
        domain: 'general',
      })
      expect(mocks.enqueueSkIngest).toHaveBeenCalledWith({
        brainId: 'brain-user',
        text: 'Launch research notes',
        sourceType: 'notes',
        title: 'Launch research notes',
        domain: 'general',
      })
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(screen.getByText('Staging (0)')).toBeTruthy()
  })

  it('skips normalized duplicate links and marks links that already exist in the brain', async () => {
    mocks.fetchSkSources.mockResolvedValue([skSource()])
    renderTrainingModal()

    const textarea = screen.getByPlaceholderText(/Paste text, links, or notes here/i)
    fireEvent.change(textarea, {
      target: {
        value: 'https://example.com/learn/\nhttps://EXAMPLE.com/learn',
      },
    })
    fireEvent.click(screen.getByRole('button', { name: /add to staging/i }))

    expect(screen.getByText('Staging (1)')).toBeTruthy()
    await waitFor(() => {
      expect(screen.getByLabelText('Already in brain')).toBeTruthy()
    })
  })

  it('bulk applies staging metadata and removes staged rows', async () => {
    renderTrainingModal()

    const textarea = screen.getByPlaceholderText(/Paste text, links, or notes here/i)
    fireEvent.change(textarea, {
      target: {
        value: 'https://example.com/learn\nLaunch research notes',
      },
    })
    fireEvent.click(screen.getByRole('button', { name: /add to staging/i }))

    fireEvent.click(screen.getByLabelText(/select all/i))
    expect(screen.getByText(/2 selected/i)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /type: type/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Manual' }))
    fireEvent.click(screen.getByRole('button', { name: /domain: domain/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Marketing' }))
    fireEvent.click(screen.getByRole('button', { name: /apply/i }))

    expect(screen.getAllByRole('button', { name: /type: manual/i })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: /domain: marketing/i })).toHaveLength(2)

    fireEvent.click(screen.getAllByRole('button', { name: /remove from staging/i })[0]!)
    expect(screen.getByText('Staging (1)')).toBeTruthy()
  })

  it('stages Fathom meetings from the connected integration source', async () => {
    mocks.listFathomMeetings.mockResolvedValue({
      items: [
        {
          id: 'meeting-1',
          title: 'Roadmap Call',
          created_at: '2026-06-24T09:00:00.000Z',
        },
      ],
      next_cursor: undefined,
    })

    renderTrainingModal()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /fathom/i })).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: /fathom/i }))
    fireEvent.click(await screen.findByRole('button', { name: /roadmap call/i }))

    expect(screen.getByText('Staging (1)')).toBeTruthy()
    expect(screen.getAllByText('Roadmap Call').length).toBeGreaterThanOrEqual(1)
  })
})
