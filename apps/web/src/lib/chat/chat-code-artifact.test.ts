import { describe, expect, it, vi } from 'vitest'
import {
  chatCodeArtifactLanguageFromMime,
  isShellCodeArtifactTarget,
  looksLikePreviewableHtml,
  splitChatCodeArtifactSegments,
  titleFromChatCode,
  toChatCodePreviewSrcDoc,
} from './chat-code-artifact'

vi.mock('@/lib/artifacts', async () => {
  const actual = await vi.importActual<typeof import('@/lib/artifacts')>('@/lib/artifacts')
  return {
    ...actual,
    openArtifactInShell: vi.fn(),
    downloadHTML: vi.fn((html: string, title: string) => `${title}.html`),
    downloadCSS: vi.fn((css: string, title: string) => `${title}.css`),
  }
})

describe('splitChatCodeArtifactSegments', () => {
  it('keeps non-previewable fences in markdown', () => {
    const text = ['Intro', '```ts', 'const n = 1', '```', 'Outro'].join('\n')
    expect(splitChatCodeArtifactSegments(text)).toEqual([{ kind: 'markdown', text }])
  })

  it('extracts html fences into code cards and keeps surrounding copy', () => {
    const text = [
      'Use this block.',
      '```html',
      '<!-- VIP progress -->',
      '<div class="vip-progress">Step 2 of 3</div>',
      '```',
      'Done.',
    ].join('\n')

    expect(splitChatCodeArtifactSegments(text)).toEqual([
      { kind: 'markdown', text: 'Use this block.\n' },
      {
        kind: 'code',
        language: 'html',
        title: 'VIP progress',
        code: '<!-- VIP progress -->\n<div class="vip-progress">Step 2 of 3</div>',
      },
      { kind: 'markdown', text: '\nDone.' },
    ])
  })

  it('uses the fence info string as the card title when present', () => {
    const text = ['```html popup header', '<header>Save your seat</header>', '```'].join('\n')
    expect(splitChatCodeArtifactSegments(text)).toEqual([
      {
        kind: 'code',
        language: 'html',
        title: 'popup header',
        code: '<header>Save your seat</header>',
      },
    ])
  })

  it('promotes unlabeled html documents and leaves open fences in markdown', () => {
    const closed = [
      '```',
      '<!DOCTYPE html>',
      '<html><body><section class="hero">Hello</section></body></html>',
      '```',
    ].join('\n')
    const open = ['```html', '<div class="still-streaming">'].join('\n')

    expect(splitChatCodeArtifactSegments(closed)[0]).toMatchObject({
      kind: 'code',
      language: 'html',
    })
    expect(splitChatCodeArtifactSegments(open)).toEqual([{ kind: 'markdown', text: open }])
  })
})

describe('chat code artifact helpers', () => {
  it('titles html from comments, headings, then class names', () => {
    expect(titleFromChatCode('<!-- ELEMENT 5 - POPUP FORM HEADER -->\n<div></div>', 'html')).toBe(
      'ELEMENT 5 - POPUP FORM HEADER',
    )
    expect(titleFromChatCode('<h1>Save your seat</h1>', 'html')).toBe('Save your seat')
    expect(titleFromChatCode('<div class="vip-progress__copy"></div>', 'html')).toBe(
      'vip progress copy',
    )
    expect(titleFromChatCode('body { color: red }', 'css')).toBe('CSS')
  })

  it('wraps fragments for preview and keeps full documents intact', () => {
    const fragment = '<div class="hero">Hi</div>'
    expect(toChatCodePreviewSrcDoc(fragment, 'html')).toContain('<body><div class="hero">Hi</div>')
    expect(toChatCodePreviewSrcDoc('<!DOCTYPE html><html><body>Hi</body></html>', 'html')).toBe(
      '<!DOCTYPE html><html><body>Hi</body></html>',
    )
    expect(toChatCodePreviewSrcDoc('.hero{color:red}', 'css')).toContain('<style>.hero{color:red}')
  })

  it('detects previewable unlabeled html and shell snippet targets', () => {
    expect(looksLikePreviewableHtml('<div>Hi</div>')).toBe(false)
    expect(
      looksLikePreviewableHtml(
        '<section class="hero"><div class="copy"><style>.x{}</style><button>Go</button></div></section>',
      ),
    ).toBe(true)
    expect(chatCodeArtifactLanguageFromMime('text/html')).toBe('html')
    expect(
      isShellCodeArtifactTarget({
        id: 'code:html:1',
        title: 'VIP progress',
        type: 'doc',
        content: '<div></div>',
        mimeType: 'text/html',
      }),
    ).toBe(true)
    expect(
      isShellCodeArtifactTarget({
        id: 'doc-1',
        entityId: 'doc-1',
        title: 'Brief',
        type: 'doc',
        content: '<div></div>',
        mimeType: 'text/html',
      }),
    ).toBe(false)
  })
})
