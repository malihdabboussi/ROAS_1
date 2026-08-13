import { describe, expect, it } from 'vitest'
import { hasDraftFence, splitDraftSegments } from './draft-versions.utils'

describe('splitDraftSegments', () => {
  it('returns a single markdown segment when no draft fences exist', () => {
    const segments = splitDraftSegments('Just some **prose**.')
    expect(segments).toEqual([{ kind: 'markdown', markdown: 'Just some **prose**.' }])
  })

  it('groups consecutive draft fences into one card with labels', () => {
    const content = [
      'Here are two options:',
      '```draft Full breakdown',
      'Long version body.',
      '```',
      '```draft Short version',
      'Short body.',
      '```',
      'Want tweaks?',
    ].join('\n')

    const segments = splitDraftSegments(content)
    expect(segments).toHaveLength(3)
    expect(segments[0]).toEqual({ kind: 'markdown', markdown: 'Here are two options:\n' })
    expect(segments[1]).toEqual({
      kind: 'draft',
      versions: [
        { label: 'Full breakdown', text: 'Long version body.' },
        { label: 'Short version', text: 'Short body.' },
      ],
    })
    expect(segments[2]).toEqual({ kind: 'markdown', markdown: '\nWant tweaks?' })
  })

  it('falls back to lettered labels and splits non-adjacent fences into separate cards', () => {
    const content = [
      '```draft',
      'First.',
      '```',
      'Interlude prose.',
      '```draft',
      'Second.',
      '```',
    ].join('\n')

    const segments = splitDraftSegments(content)
    expect(segments).toHaveLength(3)
    expect(segments[0]).toEqual({
      kind: 'draft',
      versions: [{ label: 'Version A', text: 'First.' }],
    })
    expect(segments[1]).toEqual({ kind: 'markdown', markdown: '\nInterlude prose.\n' })
    expect(segments[2]).toEqual({
      kind: 'draft',
      versions: [{ label: 'Version A', text: 'Second.' }],
    })
  })

  it('ignores ordinary code fences', () => {
    const content = 'Look:\n```ts\nconst x = 1\n```\ndone'
    expect(hasDraftFence(content)).toBe(false)
    expect(splitDraftSegments(content)).toEqual([{ kind: 'markdown', markdown: content }])
  })

  it('turns markdown-styled draft copy into send-ready plain text', () => {
    const content = [
      '```draft Clear and direct',
      '✅ **Done:** Dylan sent the notes.',
      '',
      '**Before Monday**',
      '- **Nate:** Finish the deck by **Friday EOD**.',
      '```',
    ].join('\n')

    expect(splitDraftSegments(content)).toEqual([
      {
        kind: 'draft',
        versions: [
          {
            label: 'Clear and direct',
            text: '✅ Done: Dylan sent the notes.\n\nBefore Monday\n- Nate: Finish the deck by Friday EOD.',
          },
        ],
      },
    ])
  })
})
