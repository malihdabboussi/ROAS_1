import { beforeEach, describe, expect, it, vi } from 'vitest'

type Html2PdfOptions = {
  html2canvas?: Record<string, unknown>
}

type WorkerMock = Record<'set' | 'from' | 'toPdf' | 'get' | 'save', ReturnType<typeof vi.fn>>

const html2pdfMocks = vi.hoisted(() => {
  const state: { capturedOptions: Html2PdfOptions | null } = {
    capturedOptions: null,
  }
  const pdfMock = {
    internal: {
      getNumberOfPages: vi.fn(() => 1),
    },
  }
  const worker = {} as WorkerMock

  worker.set = vi.fn((options: Html2PdfOptions) => {
    state.capturedOptions = options
    return worker
  })
  worker.from = vi.fn(() => worker)
  worker.toPdf = vi.fn(async () => undefined)
  worker.get = vi.fn(async () => pdfMock)
  worker.save = vi.fn(async () => undefined)

  return {
    html2pdfMock: vi.fn(() => worker),
    state,
    worker,
  }
})

vi.mock('html2pdf.js', () => ({
  default: html2pdfMocks.html2pdfMock,
}))

vi.mock('@/lib/campaigns', () => ({
  fetchCampaign: vi.fn(),
}))

vi.mock('@/lib/themes', () => ({
  generateGoogleFontsUrl: vi.fn(() => null),
  generateThemeCSS: vi.fn(() => ''),
  getTheme: vi.fn(),
  resolveThemeColors: vi.fn((colors) => colors),
}))

vi.mock('@/lib/artifacts/artifact-pdf-jspdf-footer', () => ({
  stampMadeWithVibeyFooterOnAllPages: vi.fn(),
}))

import { exportCampaignMarkdownDomToPdf } from './campaign-markdown-pdf-export'

describe('exportCampaignMarkdownDomToPdf', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    html2pdfMocks.state.capturedOptions = null
    vi.clearAllMocks()
  })

  it('lets html2canvas measure post-pagebreak content height', async () => {
    const contentElement = document.createElement('div')
    contentElement.innerHTML = `
      <h2>Days 31 to 60: Launch Awareness and Plasmapheresis Buildout</h2>
      <p>Publish launch awareness content across social channels.</p>
      <p>Publish LinkedIn launch article.</p>
      <p>Align PR, banners, and media partner scripts.</p>
    `

    Object.defineProperty(contentElement, 'scrollWidth', {
      configurable: true,
      value: 720,
    })
    Object.defineProperty(contentElement, 'scrollHeight', {
      configurable: true,
      value: 2400,
    })

    await exportCampaignMarkdownDomToPdf({
      campaignId: null,
      contentElement,
      filenameBase: 'Launch plan',
      preferPrintPipeline: false,
    })

    expect(html2pdfMocks.html2pdfMock).toHaveBeenCalledTimes(1)
    expect(html2pdfMocks.state.capturedOptions).toBeTruthy()
    expect(html2pdfMocks.state.capturedOptions?.html2canvas).not.toHaveProperty('height')
    expect(html2pdfMocks.state.capturedOptions?.html2canvas).not.toHaveProperty('windowHeight')
    expect(html2pdfMocks.state.capturedOptions?.html2canvas).toMatchObject({
      scrollX: 0,
      scrollY: 0,
      useCORS: true,
    })
    expect(html2pdfMocks.worker.toPdf).toHaveBeenCalledTimes(1)
    expect(html2pdfMocks.worker.save).toHaveBeenCalledTimes(1)
  })
})
