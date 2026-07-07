import { describe, expect, it } from 'vitest'
import { fakeClipboardWithImageFiles } from '../../../tests/clipboard-test-helpers'
import { extractClipboardImageFiles, extractClipboardImageFilesFromItems } from './clipboard-image'

describe('extractClipboardImageFilesFromItems', () => {
  it('returns empty for missing items', () => {
    expect(extractClipboardImageFilesFromItems(undefined)).toEqual([])
    expect(extractClipboardImageFilesFromItems(null as unknown as DataTransferItemList)).toEqual([])
  })

  it('keeps only file-kind image/* items', () => {
    const png = new File(['x'], 'shot.png', { type: 'image/png' })
    const pdf = new File(['y'], 'doc.pdf', { type: 'application/pdf' })
    const list = { length: 2 } as Record<number | 'length', unknown>
    list[0] = { kind: 'file' as const, type: png.type, getAsFile: () => png }
    list[1] = { kind: 'file' as const, type: pdf.type, getAsFile: () => pdf }
    const out = extractClipboardImageFilesFromItems(list as unknown as DataTransferItemList)
    expect(out).toHaveLength(1)
    expect(out[0]!.name).toBe('shot.png')
    expect(out[0]!.type).toBe('image/png')
  })
})

describe('extractClipboardImageFiles', () => {
  it('reads from event.clipboardData', () => {
    const dt = fakeClipboardWithImageFiles([new File(['b'], 'p.webp', { type: 'image/webp' })])
    expect(extractClipboardImageFiles({ clipboardData: dt })).toHaveLength(1)
    expect(extractClipboardImageFiles({ clipboardData: null })).toEqual([])
  })
})
