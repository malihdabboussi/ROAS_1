import { describe, expect, it, vi } from 'vitest'
import {
  abandonGoogleExportTab,
  finishGoogleExportTab,
  openGoogleExportTab,
} from './google-export-tab'

describe('google export tab', () => {
  it('opens about:blank in the same turn so later awaits cannot popup-block', () => {
    const tab = { opener: window, closed: false, location: { replace: vi.fn() }, close: vi.fn() }
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)
    const opened = openGoogleExportTab()
    expect(openSpy).toHaveBeenCalledWith('about:blank', '_blank')
    expect(opened).toBe(tab)
    expect(tab.opener).toBeNull()
    openSpy.mockRestore()
  })

  it('navigates the pending tab and closes it on abandon', () => {
    const tab = { closed: false, location: { replace: vi.fn() }, close: vi.fn() }
    expect(
      finishGoogleExportTab(
        tab as unknown as Window,
        'https://docs.google.com/document/d/doc-1/edit',
      ),
    ).toBe(true)
    expect(tab.location.replace).toHaveBeenCalledWith(
      'https://docs.google.com/document/d/doc-1/edit',
    )
    abandonGoogleExportTab(tab as unknown as Window)
    expect(tab.close).toHaveBeenCalled()
  })
})
