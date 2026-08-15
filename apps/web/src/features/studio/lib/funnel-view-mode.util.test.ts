import { describe, expect, it } from 'vitest'
import { isFunnelHtmlBundleFullMode } from './funnel-view-mode.util'

describe('isFunnelHtmlBundleFullMode', () => {
  it('enables the full funnel designer whenever an HTML bundle is present', () => {
    expect(
      isFunnelHtmlBundleFullMode({
        selectedFunnel: { id: 'funnel-1' },
        pageBundle: { page: { id: 'page-1' } } as never,
      }),
    ).toBe(true)
  })

  it('does not require a Spaces deep-work back handler', () => {
    expect(
      isFunnelHtmlBundleFullMode({
        spacesDeepWorkBack: null,
        selectedFunnel: { id: 'funnel-1' },
        funnelPages: [{ id: 'page-1', source_mode: 'html_bundle' } as never],
      }),
    ).toBe(true)
  })
})
