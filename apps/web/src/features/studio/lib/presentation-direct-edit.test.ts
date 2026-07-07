import { describe, expect, it } from 'vitest'
import type { PresentationBundle, PresentationElementTrace } from '../types'
import { applyPresentationDirectEdit } from './presentation-direct-edit'

const bundle = {
  presentation: { id: 'deck-1', name: 'Deck' },
  entry_file: 'index.html',
  source_mode: 'html_bundle',
  has_entry: true,
  assets: [],
  files: [
    {
      id: 'file-1',
      presentation_id: 'deck-1',
      user_id: 'user-1',
      org_id: null,
      path: 'index.html',
      content: '<!doctype html><section><h1>Old headline</h1></section>',
      mime_type: 'text/html',
      role: 'entry',
      size_bytes: 55,
      created_at: '',
      updated_at: '',
    },
  ],
} as unknown as PresentationBundle

const trace = {
  presentation_id: 'deck-1',
  anchor_id: null,
  dom_path: 'section > h1',
  tag_chain: ['section', 'h1'],
  text_snapshot: 'Old headline',
  bounds: null,
  slide_index: 0,
  source_file: 'index.html',
  source_hint: null,
} as PresentationElementTrace

describe('presentation direct edit', () => {
  it('replaces unique selected text', () => {
    const result = applyPresentationDirectEdit(bundle, trace, {
      type: 'text',
      value: 'New headline',
    })

    expect(result.success).toBe(true)
    if (result.success) expect(result.content).toContain('New headline')
  })

  it('persists style edits with !important so they beat theme mapping CSS', () => {
    const styledTrace = { ...trace, source_hint: '<h1>Old headline</h1>' }

    const result = applyPresentationDirectEdit(bundle, styledTrace, {
      type: 'style',
      property: 'color',
      value: '#ff0000',
    })

    expect(result.success).toBe(true)
    if (result.success) expect(result.content).toContain('style="color: #ff0000 !important;"')
  })

  it('replaces an existing declaration of the same property', () => {
    const styledBundle = {
      ...bundle,
      files: [
        {
          ...bundle.files[0]!,
          content: '<!doctype html><section><h1 style="color: blue;">Old headline</h1></section>',
        },
      ],
    }
    const styledTrace = { ...trace, source_hint: '<h1 style="color: blue;">Old headline</h1>' }

    const result = applyPresentationDirectEdit(styledBundle, styledTrace, {
      type: 'style',
      property: 'color',
      value: '#ff0000',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.content).toContain('color: #ff0000 !important;')
      expect(result.content).not.toContain('color: blue')
    }
  })

  it('rejects ambiguous text matches', () => {
    const duplicateBundle = {
      ...bundle,
      files: [{ ...bundle.files[0]!, content: '<h1>Same</h1><p>Same</p>' }],
    }
    const duplicateTrace = { ...trace, text_snapshot: 'Same' }

    const result = applyPresentationDirectEdit(duplicateBundle, duplicateTrace, {
      type: 'text',
      value: 'Next',
    })

    expect(result.success).toBe(false)
  })
})
