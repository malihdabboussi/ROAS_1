import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { MessageContentBlock } from '@/lib/chat/message-content-blocks'
import { ToolBlockInline } from './ToolBlockInline'

const activeBlock = {
  type: 'tool',
  id: 'tool-1',
  name: 'web_search',
  label: 'Researching',
  state: 'active',
  startedAt: 123,
  progress: [{ id: 'p1', detail: 'Searching sources', timestamp: 124 }],
} satisfies Extract<MessageContentBlock, { type: 'tool' }>

const completeBlock = {
  type: 'tool',
  id: 'tool-2',
  name: 'write',
  label: 'Writing output',
  state: 'complete',
  startedAt: 123,
  endedAt: 456,
} satisfies Extract<MessageContentBlock, { type: 'tool' }>

describe('ToolBlockInline', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders active tool label and latest progress', () => {
    render(<ToolBlockInline block={activeBlock} />)

    expect(screen.getByText('Researching')).toBeTruthy()
    expect(screen.getByText('Searching sources')).toBeTruthy()
  })

  it('renders completed tool label without active progress', () => {
    render(<ToolBlockInline block={completeBlock} />)

    expect(screen.getByText('Writing output')).toBeTruthy()
    expect(screen.queryByText('Searching sources')).toBeNull()
  })
})
