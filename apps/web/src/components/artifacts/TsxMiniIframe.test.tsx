import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEsbuildRunner } from '@/hooks/use-esbuild-runner'
import { createTsxRunnerScope } from '@/lib/tsx-runner/tsx-runner-scope'
import { TsxMiniIframe } from './TsxMiniIframe'

const { scopeMock } = vi.hoisted(() => ({
  scopeMock: { marker: 'tsx-runner-scope' },
}))

vi.mock('@/lib/tsx-runner/tsx-runner-scope', () => ({
  createTsxRunnerScope: vi.fn(() => scopeMock),
}))

vi.mock('@/hooks/use-esbuild-runner', () => ({
  useEsbuildRunner: vi.fn(() => ({ element: 'compiled preview' })),
}))

const createTsxRunnerScopeMock = vi.mocked(createTsxRunnerScope)
const useEsbuildRunnerMock = vi.mocked(useEsbuildRunner)

describe('TsxMiniIframe', () => {
  let originalGetBoundingClientRect: typeof HTMLElement.prototype.getBoundingClientRect

  beforeEach(() => {
    originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect
    HTMLElement.prototype.getBoundingClientRect = vi.fn(() => ({
      bottom: 160,
      height: 160,
      left: 0,
      right: 320,
      top: 0,
      width: 320,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }))
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = vi.fn()
        unobserve = vi.fn()
        disconnect = vi.fn()
      },
    )
  })

  afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('passes TSX through the shared runner scope and iframe document shell', async () => {
    const code = 'export default function Preview() { return <div>Preview</div> }'

    render(<TsxMiniIframe code={code} css=".preview { color: red; }" title="Artifact preview" />)

    const iframe = screen.getByTitle('Artifact preview') as HTMLIFrameElement
    const srcDoc = iframe.getAttribute('srcdoc') ?? ''

    expect(createTsxRunnerScopeMock).toHaveBeenCalledTimes(1)
    expect(useEsbuildRunnerMock.mock.calls[0]?.[0]).toEqual({ code, scope: scopeMock })
    expect(srcDoc).toContain('<style id="vcss"></style>')
    expect(srcDoc).toContain('<div id="vr"></div>')

    await waitFor(() => {
      expect(iframe.style.transform).toBe('scale(0.25)')
    })
    expect(iframe.style.width).toBe('1280px')
    expect(iframe.style.height).toBe('800px')
    expect(iframe.style.left).toBe('0px')
    expect(iframe.style.top).toBe('-20px')
  })
})
