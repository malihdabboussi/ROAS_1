import { describe, expect, it } from 'vitest'
import { appendAssetsToDescription } from './work-request-assets'

describe('appendAssetsToDescription', () => {
  const assets = [
    { name: 'MFS_Elite.pdf', url: 'https://storage.roas.io/x/MFS_Elite.pdf', kind: 'pdf' },
    { name: 'brief', url: 'https://docs.google.com/document/d/1' },
  ]

  it('appends an Assets section and the source thread once', () => {
    const once = appendAssetsToDescription('Brief body', assets, {
      sourceUrl: 'https://roas.slack.com/archives/C1/p1',
    })
    expect(once).toContain(
      'Assets:\n- MFS_Elite.pdf (pdf): https://storage.roas.io/x/MFS_Elite.pdf',
    )
    expect(once).toContain('- brief: https://docs.google.com/document/d/1')
    expect(once).toContain('Source thread: https://roas.slack.com/archives/C1/p1')
    const twice = appendAssetsToDescription(once, assets, {
      sourceUrl: 'https://roas.slack.com/archives/C1/p1',
    })
    expect(twice).toBe(once)
  })

  it('leaves the description untouched when there is nothing new', () => {
    expect(appendAssetsToDescription('Body', [], {})).toBe('Body')
    expect(appendAssetsToDescription(null, [], {})).toBeNull()
    expect(
      appendAssetsToDescription('See https://docs.google.com/document/d/1 already', [assets[1]]),
    ).toBe('See https://docs.google.com/document/d/1 already')
  })

  it('works with an empty description', () => {
    expect(appendAssetsToDescription(null, [assets[0]])).toBe(
      'Assets:\n- MFS_Elite.pdf (pdf): https://storage.roas.io/x/MFS_Elite.pdf',
    )
  })
})
