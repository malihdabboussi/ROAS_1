import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MissionDeliverable } from '@/lib/missions'
import { exportPresentationDeliverable } from './deliverable-presentation-export'

const presentationExportMocks = vi.hoisted(() => ({
  buildStandalonePresentationHtml: vi.fn(),
  downloadHTML: vi.fn(),
  downloadPresentationPDFFromIframe: vi.fn(),
  downloadPresentationPDFFromSlides: vi.fn(),
  downloadPresentationPPTFromIframe: vi.fn(),
  downloadPresentationPPTFromSlides: vi.fn(),
  fetchPresentationBundle: vi.fn(),
}))

vi.mock('@/lib/artifacts', () => ({
  buildStandalonePresentationHtml: presentationExportMocks.buildStandalonePresentationHtml,
  downloadHTML: presentationExportMocks.downloadHTML,
  downloadPresentationPDFFromIframe: presentationExportMocks.downloadPresentationPDFFromIframe,
  downloadPresentationPDFFromSlides: presentationExportMocks.downloadPresentationPDFFromSlides,
  downloadPresentationPPTFromIframe: presentationExportMocks.downloadPresentationPPTFromIframe,
  downloadPresentationPPTFromSlides: presentationExportMocks.downloadPresentationPPTFromSlides,
  fetchPresentationBundle: presentationExportMocks.fetchPresentationBundle,
}))

const presentationDeliverable: MissionDeliverable = {
  id: 'deliverable-1',
  mission_id: 'mission-1',
  campaign_id: 'campaign-1',
  user_id: 'user-1',
  agent_key: 'vibey',
  type: 'presentation',
  title: 'Launch deck',
  content: null,
  file_url: null,
  file_name: null,
  file_size: null,
  mime_type: null,
  metadata: {},
  entity_id: 'presentation-1',
  entity_table: 'presentations',
  source: 'mission',
  created_at: '2026-06-28T10:30:00.000Z',
}

describe('exportPresentationDeliverable', () => {
  beforeEach(() => {
    for (const mock of Object.values(presentationExportMocks)) {
      mock.mockReset()
    }
    document.body.innerHTML = ''
  })

  it('downloads standalone HTML when a presentation bundle has an entry file', async () => {
    presentationExportMocks.fetchPresentationBundle.mockResolvedValue({
      source_mode: 'html_bundle',
      has_entry: true,
      entry_file: 'index.html',
      files: [],
      assets: [],
      presentation: {},
    })
    presentationExportMocks.buildStandalonePresentationHtml.mockResolvedValue('<html>deck</html>')

    await exportPresentationDeliverable({
      format: 'html',
      deliverable: presentationDeliverable,
      entityData: {},
      title: 'Launch deck',
    })

    expect(presentationExportMocks.fetchPresentationBundle).toHaveBeenCalledWith('presentation-1')
    expect(presentationExportMocks.buildStandalonePresentationHtml).toHaveBeenCalled()
    expect(presentationExportMocks.downloadHTML).toHaveBeenCalledWith(
      '<html>deck</html>',
      'Launch deck',
    )
  })

  it('falls back to generated HTML when bundle HTML is unavailable', async () => {
    presentationExportMocks.fetchPresentationBundle.mockResolvedValue({
      source_mode: 'slides',
      has_entry: false,
      files: [],
      assets: [],
      presentation: {},
    })

    await exportPresentationDeliverable({
      format: 'html',
      deliverable: presentationDeliverable,
      entityData: { generated_html: '<html>generated</html>' },
      title: 'Generated deck',
    })

    expect(presentationExportMocks.downloadHTML).toHaveBeenCalledWith(
      '<html>generated</html>',
      'Generated deck',
    )
  })

  it('uses live iframe exports before slide-data fallbacks', async () => {
    const iframe = document.createElement('iframe')
    iframe.setAttribute('data-presentation-export-iframe', 'true')
    document.body.appendChild(iframe)

    await exportPresentationDeliverable({
      format: 'pdf',
      deliverable: presentationDeliverable,
      entityData: { slides: [{ title: 'Slide 1' }] },
      title: 'Iframe deck',
    })

    expect(presentationExportMocks.downloadPresentationPDFFromIframe).toHaveBeenCalledWith(
      'Iframe deck',
    )
    expect(presentationExportMocks.downloadPresentationPDFFromSlides).not.toHaveBeenCalled()

    iframe.remove()

    await exportPresentationDeliverable({
      format: 'ppt',
      deliverable: presentationDeliverable,
      entityData: { slides: [{ title: 'Slide 1' }] },
      title: 'Slides deck',
    })

    expect(presentationExportMocks.downloadPresentationPPTFromSlides).toHaveBeenCalledWith(
      [{ title: 'Slide 1' }],
      'Slides deck',
    )
  })
})
