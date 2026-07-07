import { describe, expect, it, vi } from 'vitest'
import {
  buildPresentationSourceImportPrompt,
  dispatchPresentationSourceImport,
  SPACE_PRESENTATION_SOURCE_IMPORT_EVENT,
} from '../presentation-import-events'

describe('presentation import events', () => {
  it('builds the PPTX/PDF conversion prompt contract', () => {
    const file = new File(['source'], 'deck.pdf', { type: 'application/pdf' })

    const prompt = buildPresentationSourceImportPrompt(file)

    expect(prompt).toContain('turn it into an editable Vibey HTML presentation')
    expect(prompt).toContain('Use read_document with the attached asset_id')
    expect(prompt).toContain('create_presentation with files and index.html as the entry_file')
    expect(prompt).toContain('<section>')
  })

  it('dispatches the selected file and prompt to Spaces chat', () => {
    const listener = vi.fn()
    window.addEventListener(SPACE_PRESENTATION_SOURCE_IMPORT_EVENT, listener)
    const file = new File(['source'], 'deck.pptx', {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    })

    dispatchPresentationSourceImport(file)

    expect(listener).toHaveBeenCalledTimes(1)
    const detail = (listener.mock.calls[0]?.[0] as CustomEvent).detail
    expect(detail.files).toEqual([file])
    expect(detail.prompt).toContain('deck.pptx')

    window.removeEventListener(SPACE_PRESENTATION_SOURCE_IMPORT_EVENT, listener)
  })
})
