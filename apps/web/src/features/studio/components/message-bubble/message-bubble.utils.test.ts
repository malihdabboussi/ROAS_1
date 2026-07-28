import { describe, expect, it } from 'vitest'
import type { MessageContentBlock } from '../../types'
import { buildActivityGroupLabel } from '../chat/LockedInGroup'
import {
  buildFinalAnswerLayoutSegments,
  buildOrderedLayoutSegments,
  coalesceConsecutiveReadTools,
  extractBrowserPanelData,
  extractFinalOutputBlocks,
  type OrderedLayoutBaseSegment,
} from './message-bubble.utils'

function text(id: string, content = 'Update'): MessageContentBlock {
  return { type: 'text', id, content }
}

function thinking(id: string, content = 'Thinking'): MessageContentBlock {
  return { type: 'thinking_transcript', id, content, state: 'complete' }
}

function tool(
  id: string,
  name: string,
  label = 'Working',
  action?: string,
): Extract<MessageContentBlock, { type: 'tool' }> {
  return {
    type: 'tool',
    id,
    name,
    label,
    ...(action ? { action } : {}),
    state: 'complete',
    startedAt: 1,
    endedAt: 2,
  }
}

function groupLabels(blocks: MessageContentBlock[]): string[] {
  const { segments } = buildOrderedLayoutSegments(blocks)
  return segments.map((segment) =>
    segment.kind === 'locked_in'
      ? `group:${segment.blocks.map((block) => block.id).join(',')}`
      : `block:${segment.block.id}`,
  )
}

function finalAnswerLabels(blocks: MessageContentBlock[]): string[] {
  const { segments } = buildFinalAnswerLayoutSegments(blocks)
  return segments.map((segment) => {
    if (segment.kind === 'locked_in') {
      return `group:${segment.blocks.map((block) => block.id).join(',')}`
    }
    if (segment.kind === 'worked_summary') {
      return `summary:${segment.blocks.map((block) => block.id).join(',')}`
    }
    if (segment.kind === 'final_outputs') {
      return `outputs:${segment.blocks.map((block) => block.id).join(',')}`
    }
    return `block:${segment.block.id}`
  })
}

function layoutSegmentLabels(segments: OrderedLayoutBaseSegment[]): string[] {
  return segments.map((segment) =>
    segment.kind === 'locked_in'
      ? `group:${segment.blocks.map((block) => block.id).join(',')}`
      : `block:${segment.block.id}`,
  )
}

describe('buildOrderedLayoutSegments', () => {
  it('groups tools before the first text block', () => {
    expect(
      groupLabels([tool('read-1', 'read'), tool('search-1', 'web_search'), text('text-1')]),
    ).toEqual(['group:read-1,search-1', 'block:text-1'])
  })

  it('creates separate groups after text blocks instead of only grouping the first round', () => {
    expect(
      groupLabels([
        text('text-1'),
        tool('read-1', 'read'),
        tool('read-2', 'read'),
        text('text-2'),
        tool('exec-1', 'exec'),
      ]),
    ).toEqual(['block:text-1', 'group:read-1,read-2', 'block:text-2', 'group:exec-1'])
  })

  it('breaks groups around non-groupable UI cards', () => {
    const documentCard: MessageContentBlock = {
      type: 'document_card',
      id: 'doc-1',
      title: 'Doc',
      documentId: 'document-1',
      snippet: 'Snippet',
    }

    expect(groupLabels([tool('read-1', 'read'), documentCard, tool('exec-1', 'exec')])).toEqual([
      'group:read-1',
      'block:doc-1',
      'group:exec-1',
    ])
  })

  it('keeps browser blocks compatible with browser panel extraction', () => {
    const browserTool = tool('browser-1', 'browser', 'Browsing')
    const screenshot: MessageContentBlock = {
      type: 'browser_screenshot',
      id: 'shot-1',
      imageUrl: 'https://example.com/screenshot.png',
      pageUrl: 'https://example.com',
    }
    const blocks = [text('text-1'), browserTool, screenshot, text('text-2')]

    expect(groupLabels(blocks)).toEqual([
      'block:text-1',
      'group:browser-1',
      'block:shot-1',
      'block:text-2',
    ])

    const panel = extractBrowserPanelData(blocks)
    expect(panel.hasBrowserPanel).toBe(true)
    expect(panel.browserBlockIds.has('browser-1')).toBe(true)
    expect(panel.browserBlockIds.has('shot-1')).toBe(true)
  })
})

describe('buildFinalAnswerLayoutSegments', () => {
  it('collapses prior work and updates into one summary before the final answer', () => {
    const blocks = [
      thinking('thought-1'),
      tool('read-1', 'read'),
      text('update-1', 'I checked the files.'),
      tool('exec-1', 'exec'),
      text('answer-1', 'Here is the final answer.'),
    ]
    const { segments } = buildFinalAnswerLayoutSegments(blocks)
    const summary = segments[0]

    expect(finalAnswerLabels(blocks)).toEqual([
      'summary:thought-1,read-1,update-1,exec-1',
      'block:answer-1',
    ])
    expect(summary?.kind).toBe('worked_summary')
    if (summary?.kind !== 'worked_summary') throw new Error('Expected worked summary segment')
    expect(layoutSegmentLabels(summary.segments)).toEqual([
      'group:thought-1,read-1',
      'block:update-1',
      'group:exec-1',
    ])
  })

  it('keeps regular grouping when there is no prior work before the only text block', () => {
    expect(finalAnswerLabels([text('answer-1', 'Here is the final answer.')])).toEqual([
      'block:answer-1',
    ])
  })

  it('keeps pending clarification cards visible after the final answer instead of collapsing them', () => {
    const clarification: MessageContentBlock = {
      type: 'clarification',
      id: 'clarify-1',
      title: 'Flow choices',
      questions: [
        {
          id: 'q1',
          text: 'Which Slack channel?',
          type: 'single_choice',
          options: [{ id: 'a', label: 'General' }],
          required: true,
        },
      ],
      status: 'pending',
    }
    const blocks = [
      tool('read-1', 'read'),
      clarification,
      text('answer-1', 'Please answer the questions below.'),
    ]

    expect(finalAnswerLabels(blocks)).toEqual([
      'summary:read-1',
      'block:answer-1',
      'block:clarify-1',
    ])
  })

  it('adds final output cards after the final answer while keeping previews in the worked summary', () => {
    const documentCard: MessageContentBlock = {
      type: 'document_card',
      id: 'doc-1',
      title: 'Launch brief',
      documentId: 'document-1',
      snippet: 'A concise launch brief.',
    }
    const presentationCard: MessageContentBlock = {
      type: 'artifact_preview',
      id: 'presentation-1',
      artifactType: 'presentation',
      artifactId: 'deck-1',
      name: 'Launch deck',
    }
    const blocks = [
      tool('exec-1', 'vibey_backend', 'Creating outputs'),
      documentCard,
      presentationCard,
      text('answer-1', 'Done.'),
    ]

    expect(finalAnswerLabels(blocks)).toEqual([
      'summary:exec-1,doc-1,presentation-1',
      'block:answer-1',
      'outputs:doc-1,presentation-1',
    ])
  })

  it('keeps media_asset only in final output cards, not duplicated in the worked summary', () => {
    const media: MessageContentBlock = {
      type: 'media_asset',
      id: 'media-1',
      kind: 'video',
      title: 'Processed media',
      url: 'https://cdn.example.com/story.mp4',
      mediaAssetId: '548941d2-dc17-4943-a0d2-37a66e263aa6',
    }
    const blocks = [
      tool('exec-1', 'process_media', 'Rendering story'),
      media,
      text('answer-1', 'It rendered.'),
    ]

    expect(finalAnswerLabels(blocks)).toEqual([
      'summary:exec-1',
      'block:answer-1',
      'outputs:media-1',
    ])
  })
})

describe('extractFinalOutputBlocks', () => {
  it('dedupes final outputs by durable artifact key', () => {
    const first: MessageContentBlock = {
      type: 'document_card',
      id: 'doc-1',
      title: 'Launch brief',
      documentId: 'document-1',
      snippet: 'First',
    }
    const duplicate: MessageContentBlock = {
      type: 'document_card',
      id: 'doc-2',
      title: 'Launch brief',
      documentId: 'document-1',
      snippet: 'Second',
    }

    expect(extractFinalOutputBlocks([first, duplicate, text('answer-1')])).toEqual([first])
  })
})

describe('coalesceConsecutiveReadTools', () => {
  it('keeps consecutive reads as one visual block while preserving summary count', () => {
    const displayBlocks = coalesceConsecutiveReadTools(
      [tool('read-1', 'read', 'Reading one'), tool('read-2', 'read', 'Reading two')],
      false,
    )

    expect(displayBlocks).toHaveLength(1)
    expect(buildActivityGroupLabel(displayBlocks, false)).toBe('Read 2 files')
  })

  it('coalesces repeated skill reads as context gathering', () => {
    const displayBlocks = coalesceConsecutiveReadTools(
      [
        tool('skill-1', 'read_skill', 'Reading skill instructions'),
        tool('skill-2', 'read_skill', 'Reading skill instructions'),
      ],
      false,
    )

    expect(displayBlocks).toHaveLength(1)
    expect(buildActivityGroupLabel(displayBlocks, false)).toBe('Read 2 files')
  })
})

describe('buildActivityGroupLabel', () => {
  it('labels read-only groups', () => {
    expect(buildActivityGroupLabel([tool('read-1', 'read')], false)).toBe('Read 1 file')
  })

  it('labels search-only groups', () => {
    expect(buildActivityGroupLabel([tool('search-1', 'web_search')], false)).toBe(
      'Searched 1 search',
    )
  })

  it('labels command-only groups', () => {
    expect(buildActivityGroupLabel([tool('exec-1', 'exec')], false)).toBe('Ran 1 command')
  })

  it('labels mixed context gathering as explored', () => {
    const displayBlocks = coalesceConsecutiveReadTools(
      [
        tool('read-1', 'read'),
        tool('read-2', 'read'),
        tool('search-1', 'web_search'),
        tool('exec-1', 'exec'),
      ],
      false,
    )

    expect(buildActivityGroupLabel(displayBlocks, false)).toBe(
      'Explored 2 files, 1 search, ran 1 command',
    )
  })

  it('falls back for unknown tools', () => {
    expect(buildActivityGroupLabel([tool('custom-1', 'custom_tool')], false)).toBe('Worked 1 tool')
  })

  it('keeps active groups open under an activity label', () => {
    expect(buildActivityGroupLabel([tool('read-1', 'read')], true)).toBe('Exploring...')
  })
})
