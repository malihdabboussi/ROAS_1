import { describe, expect, it } from 'vitest'
import { splitChatMarkdownSegments } from './chat-markdown.utils'

describe('splitChatMarkdownSegments', () => {
  it('keeps plain markdown as a single segment', () => {
    expect(splitChatMarkdownSegments('Hello **world**')).toEqual([
      { kind: 'markdown', text: 'Hello **world**' },
    ])
  })

  it('extracts a closed mermaid fence so chat can render it outside innerHTML', () => {
    const text = ['Intro', '```mermaid', 'flowchart TD', '  A --> B', '```', 'Outro'].join('\n')
    expect(splitChatMarkdownSegments(text)).toEqual([
      { kind: 'markdown', text: 'Intro\n' },
      { kind: 'mermaid', code: 'flowchart TD\n  A --> B', incomplete: false },
      { kind: 'markdown', text: '\nOutro' },
    ])
  })

  it('marks an unclosed mermaid fence as incomplete while the reply is still streaming', () => {
    const text = ['```mermaid', 'sequenceDiagram', '  Alice->>Bob: hi'].join('\n')
    expect(splitChatMarkdownSegments(text)).toEqual([
      {
        kind: 'mermaid',
        code: 'sequenceDiagram\n  Alice->>Bob: hi',
        incomplete: true,
      },
    ])
  })

  it('supports tilde fences', () => {
    const text = ['~~~mermaid', 'pie title Pets', '  "Dogs": 8', '~~~'].join('\n')
    expect(splitChatMarkdownSegments(text)).toEqual([
      { kind: 'mermaid', code: 'pie title Pets\n  "Dogs": 8', incomplete: false },
    ])
  })
})
