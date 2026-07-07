import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MissionDeliverable } from '@/lib/missions'

import { useDeliverableExportActions } from './use-deliverable-export-actions'

type WorkerMock = Record<'set' | 'from' | 'toPdf' | 'get' | 'save', ReturnType<typeof vi.fn>>

const exportActionMocks = vi.hoisted(() => ({
  downloadJSON: vi.fn(),
  downloadMarkdown: vi.fn(),
  exportCampaignMarkdownDomToPdf: vi.fn(),
  exportPresentationDeliverable: vi.fn(),
  buildAvatarPdfExportRoot: vi.fn(),
  buildOfferPdfExportRoot: vi.fn(),
  html2pdfMock: vi.fn(),
  pdfOptions: { current: null as unknown },
  pdfValue: {},
  pdfWorker: {} as WorkerMock,
  sanitizeFilename: vi.fn(),
  stampMadeWithVibeyFooterOnAllPages: vi.fn(),
  toastError: vi.fn(),
  triggerRemotePdfDownload: vi.fn(),
}))

exportActionMocks.pdfWorker.set = vi.fn((options: unknown) => {
  exportActionMocks.pdfOptions.current = options
  return exportActionMocks.pdfWorker
})
exportActionMocks.pdfWorker.from = vi.fn(() => exportActionMocks.pdfWorker)
exportActionMocks.pdfWorker.toPdf = vi.fn(async () => undefined)
exportActionMocks.pdfWorker.get = vi.fn(async () => exportActionMocks.pdfValue)
exportActionMocks.pdfWorker.save = vi.fn(async () => undefined)
exportActionMocks.html2pdfMock.mockImplementation(() => exportActionMocks.pdfWorker)

vi.mock('html2pdf.js', () => ({
  default: exportActionMocks.html2pdfMock,
}))

vi.mock('@/components/deliverables/deliverable-presentation-export', () => ({
  exportPresentationDeliverable: exportActionMocks.exportPresentationDeliverable,
}))

vi.mock('@/features/studio/config/studio-inline-errors.config', () => ({
  STUDIO_INLINE_ERRORS: {
    DOWNLOAD_FAILED: "Couldn't download. Try again.",
  },
}))

vi.mock('@/features/studio/lib/campaign-markdown-pdf-export', () => ({
  exportCampaignMarkdownDomToPdf: exportActionMocks.exportCampaignMarkdownDomToPdf,
  triggerRemotePdfDownload: exportActionMocks.triggerRemotePdfDownload,
}))

vi.mock('@/features/studio/utils/artifact-pdf-jspdf-footer', () => ({
  stampMadeWithVibeyFooterOnAllPages: exportActionMocks.stampMadeWithVibeyFooterOnAllPages,
}))

vi.mock('@/features/studio/utils/artifact-pdf-shared', () => ({
  ARTIFACT_HTML2PDF_PAGEBREAK: {
    avoid: ['.avoid-break'],
    mode: ['css', 'legacy'],
  },
}))

vi.mock('@/features/studio/utils/avatar-pdf-export', () => ({
  buildAvatarPdfExportRoot: exportActionMocks.buildAvatarPdfExportRoot,
}))

vi.mock('@/features/studio/utils/offer-pdf-export', () => ({
  buildOfferPdfExportRoot: exportActionMocks.buildOfferPdfExportRoot,
}))

vi.mock('@/lib/artifacts', () => ({
  ARTIFACT_HTML2PDF_PAGEBREAK: {
    avoid: ['.avoid-break'],
    mode: ['css', 'legacy'],
  },
  ARTIFACT_INLINE_ERRORS: {
    DOWNLOAD_FAILED: "Couldn't download. Try again.",
  },
  buildAvatarPdfExportRoot: exportActionMocks.buildAvatarPdfExportRoot,
  buildOfferPdfExportRoot: exportActionMocks.buildOfferPdfExportRoot,
  downloadJSON: exportActionMocks.downloadJSON,
  downloadMarkdown: exportActionMocks.downloadMarkdown,
  exportCampaignMarkdownDomToPdf: exportActionMocks.exportCampaignMarkdownDomToPdf,
  sanitizeFilename: exportActionMocks.sanitizeFilename,
  stampMadeWithVibeyFooterOnAllPages: exportActionMocks.stampMadeWithVibeyFooterOnAllPages,
  triggerRemotePdfDownload: exportActionMocks.triggerRemotePdfDownload,
}))

vi.mock('sonner', () => ({
  toast: {
    error: exportActionMocks.toastError,
  },
}))

const deliverable: MissionDeliverable = {
  id: 'deliverable-1',
  mission_id: 'mission-1',
  campaign_id: 'campaign-1',
  user_id: 'user-1',
  agent_key: 'vibey',
  type: 'offer',
  title: 'Launch brief',
  content: '{"text":"Hello\\\\nWorld"}',
  file_url: null,
  file_name: null,
  file_size: null,
  mime_type: null,
  metadata: {},
  entity_id: 'offer-1',
  entity_table: 'offers',
  source: 'mission',
  created_at: '2026-06-28T11:25:00.000Z',
}

type HarnessOptions = Parameters<typeof useDeliverableExportActions>[0]

function createPdfExportRoot(label: string) {
  const root = document.createElement('div')
  root.textContent = label
  return {
    root,
    scopeClass: 'mock-pdf-root',
    styles: '.mock-pdf-root{}',
  }
}

function renderHarness(overrides: Partial<HarnessOptions> = {}) {
  let renderCount = 0

  function Harness() {
    renderCount += 1
    const actions = useDeliverableExportActions({
      deliverable,
      campaignId: 'campaign-1',
      hasSourcePdfFile: false,
      isTextType: true,
      isEntityType: true,
      entityData: { id: 'offer-1', name: 'Growth Offer' },
      entityTextContent: 'Entity markdown',
      effectiveMarkdown: null,
      ...overrides,
    })
    return (
      <div>
        <div ref={actions.contentRef}>Markdown body</div>
        <button type="button" onClick={() => void actions.handleExportPdf()}>
          Export PDF
        </button>
        <button type="button" onClick={actions.handleExportMd}>
          Export markdown
        </button>
        <button type="button" onClick={() => void actions.handleEntityExport('json')}>
          Export JSON
        </button>
        <button type="button" onClick={() => void actions.handleEntityExport('pdf')}>
          Export entity PDF
        </button>
        <span data-testid="exporting">{actions.exporting ? 'exporting' : 'idle'}</span>
      </div>
    )
  }

  render(<Harness />)
  return { getRenderCount: () => renderCount }
}

describe('useDeliverableExportActions', () => {
  beforeEach(() => {
    for (const mock of Object.values(exportActionMocks)) {
      if (typeof mock === 'function' && 'mockReset' in mock) {
        mock.mockReset()
      }
    }
    for (const mock of Object.values(exportActionMocks.pdfWorker)) {
      mock.mockReset()
    }
    exportActionMocks.pdfOptions.current = null
    exportActionMocks.pdfWorker.set.mockImplementation((options: unknown) => {
      exportActionMocks.pdfOptions.current = options
      return exportActionMocks.pdfWorker
    })
    exportActionMocks.pdfWorker.from.mockImplementation(() => exportActionMocks.pdfWorker)
    exportActionMocks.pdfWorker.toPdf.mockResolvedValue(undefined)
    exportActionMocks.pdfWorker.get.mockResolvedValue(exportActionMocks.pdfValue)
    exportActionMocks.pdfWorker.save.mockResolvedValue(undefined)
    exportActionMocks.html2pdfMock.mockImplementation(() => exportActionMocks.pdfWorker)
    exportActionMocks.exportCampaignMarkdownDomToPdf.mockResolvedValue(undefined)
    exportActionMocks.exportPresentationDeliverable.mockResolvedValue(undefined)
    exportActionMocks.buildAvatarPdfExportRoot.mockImplementation(() => createPdfExportRoot('Avatar PDF'))
    exportActionMocks.buildOfferPdfExportRoot.mockImplementation(() => createPdfExportRoot('Offer PDF'))
    exportActionMocks.sanitizeFilename.mockImplementation((title: string) =>
      title.toLowerCase().replace(/\s+/g, '-'),
    )
  })

  afterEach(() => {
    cleanup()
  })

  it('exports normalized markdown and JSON without render churn', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { getRenderCount } = renderHarness()

    fireEvent.click(screen.getByRole('button', { name: 'Export markdown' }))
    expect(exportActionMocks.downloadMarkdown).toHaveBeenCalledWith(
      'Hello\nWorld',
      'Launch brief',
      'deliverable',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Export JSON' }))
    await waitFor(() =>
      expect(exportActionMocks.downloadJSON).toHaveBeenCalledWith(
        { id: 'offer-1', name: 'Growth Offer' },
        'Launch brief',
        'deliverable',
      ),
    )
    expect(screen.getByTestId('exporting').textContent).toBe('idle')

    const renderLoopErrors = consoleErrorSpy.mock.calls.filter(([message]) =>
      String(message).match(/maximum update depth|too many re-renders/i),
    )
    expect(renderLoopErrors).toHaveLength(0)
    expect(getRenderCount()).toBeLessThan(20)
    consoleErrorSpy.mockRestore()
  })

  it('downloads source PDFs directly without render churn', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { getRenderCount } = renderHarness({
      deliverable: {
        ...deliverable,
        file_name: 'Launch brief.pdf',
        file_url: 'https://files.example/launch-brief.pdf',
      },
      hasSourcePdfFile: true,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Export PDF' }))

    await waitFor(() =>
      expect(exportActionMocks.triggerRemotePdfDownload).toHaveBeenCalledWith(
        'https://files.example/launch-brief.pdf',
        'Launch brief.pdf',
        'Launch brief',
      ),
    )
    expect(exportActionMocks.exportCampaignMarkdownDomToPdf).not.toHaveBeenCalled()
    expect(screen.getByTestId('exporting').textContent).toBe('idle')

    const renderLoopErrors = consoleErrorSpy.mock.calls.filter(([message]) =>
      String(message).match(/maximum update depth|too many re-renders/i),
    )
    expect(renderLoopErrors).toHaveLength(0)
    expect(getRenderCount()).toBeLessThan(20)
    consoleErrorSpy.mockRestore()
  })

  it('shows the shared download error when presentation PDF export fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    exportActionMocks.exportPresentationDeliverable.mockRejectedValueOnce(new Error('PDF failed'))

    renderHarness({
      deliverable: {
        ...deliverable,
        type: 'presentation',
      },
      entityData: { id: 'presentation-1', name: 'Launch deck' },
      entityTextContent: 'Launch deck',
    })

    fireEvent.click(screen.getByRole('button', { name: 'Export entity PDF' }))

    await waitFor(() =>
      expect(exportActionMocks.toastError).toHaveBeenCalledWith("Couldn't download. Try again."),
    )
    expect(screen.getByTestId('exporting').textContent).toBe('idle')
    consoleErrorSpy.mockRestore()
  })

  it('builds generic offer PDFs with shared pagebreak and footer helpers', async () => {
    renderHarness()

    fireEvent.click(screen.getByRole('button', { name: 'Export entity PDF' }))

    await waitFor(() => expect(exportActionMocks.pdfWorker.save).toHaveBeenCalledTimes(1))
    expect(exportActionMocks.buildOfferPdfExportRoot).toHaveBeenCalledWith({
      id: 'offer-1',
      name: 'Growth Offer',
    })
    expect(exportActionMocks.stampMadeWithVibeyFooterOnAllPages).toHaveBeenCalledWith(
      exportActionMocks.pdfValue,
    )

    const options = exportActionMocks.pdfOptions.current as {
      filename?: string
      pagebreak?: { avoid?: readonly string[]; mode?: readonly string[] }
    }
    expect(options.filename).toBe('launch-brief.pdf')
    expect(options.pagebreak?.mode).toEqual(['css', 'legacy'])
    expect(options.pagebreak?.avoid).toEqual(['.avoid-break'])
    expect(screen.getByTestId('exporting').textContent).toBe('idle')
  })
})
