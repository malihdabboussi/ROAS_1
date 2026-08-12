import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MessageContentBlock } from '../../types'
import type { ContentBlockRenderContext } from './message-bubble.types'
import { messageContentBlockPartB } from './MessageContentBlockSwitchPartB'

const chatServiceMocks = vi.hoisted(() => ({
  patchMessageMetadata: vi.fn(),
}))

vi.mock('../../services/chat.service', () => chatServiceMocks)

vi.mock('../../services/artifact-preview.service', () => ({
  fetchDocument: vi.fn(),
}))

const flowClarificationMocks = vi.hoisted(() => ({
  dispatchFlowClarificationAnswer: vi.fn(),
}))

vi.mock('@/features/flows/lib/flow-clarification-ui', () => flowClarificationMocks)

function createContext(
  overrides: Partial<ContentBlockRenderContext> = {},
): ContentBlockRenderContext {
  return {
    message: {
      id: 'message-1',
      conversation_id: 'conversation-1',
      role: 'assistant',
      content: null,
      content_blocks: null,
      metadata: {},
      created_at: '2026-08-11T00:00:00Z',
    },
    contentBlocksOrdered: [],
    isCurrentlyStreaming: false,
    isBeingWorkedOn: false,
    lastTextBlockId: null,
    toolStyleIndex: 0,
    latestPlanBlockIds: new Set(),
    replaceUiBlock: vi.fn(),
    appendUiBlockToOrderedBlocks: vi.fn(),
    setOrderedBlocks: vi.fn(),
    sendOrApprove: vi.fn(),
    ...overrides,
  } as ContentBlockRenderContext
}

function PartBHarness({
  block,
  ctx,
}: {
  block: MessageContentBlock
  ctx: ContentBlockRenderContext
}) {
  return <>{messageContentBlockPartB(block, ctx)}</>
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

/**
 * Regression for the ask_clarification message-shape contract:
 * the block below is exactly what agent-api's ui-block-extractor emits for a
 * vibey_backend ask_clarification tool result (type/source/title/introMessage/
 * questions/status). It must render the tappable card, and the submitted
 * answer must flow back into the conversation via sendOrApprove.
 */
describe('messageContentBlockPartB clarification rendering', () => {
  const clarificationBlock: MessageContentBlock = {
    type: 'clarification',
    id: 'clarification-321',
    source: 'ask_clarification',
    title: 'Choose a direction',
    introMessage: 'Pick one before I start.',
    questions: [
      {
        id: 'direction',
        text: 'Which direction should I take?',
        type: 'single_choice',
        options: [
          { id: 'option_a', label: 'Option A', description: 'Why this fits' },
          { id: 'option_b', label: 'Option B' },
        ],
        required: true,
      },
    ],
    status: 'pending',
  }

  it('renders the clarification card from the agent-emitted block shape', () => {
    render(<PartBHarness block={clarificationBlock} ctx={createContext()} />)

    expect(screen.queryByText('Asking for clarification')).not.toBeNull()
    expect(screen.queryByText('Pick one before I start.')).not.toBeNull()
    expect(screen.queryByText('Which direction should I take?')).not.toBeNull()
    expect(screen.queryByText(/Option A/)).not.toBeNull()
    expect(screen.queryByText(/Option B/)).not.toBeNull()
  })

  it('sends the picked answer back into the conversation and marks the block submitted', () => {
    const sendOrApprove = vi.fn()
    const replaceUiBlock = vi.fn()
    render(
      <PartBHarness
        block={clarificationBlock}
        ctx={createContext({ sendOrApprove, replaceUiBlock })}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Option A/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(replaceUiBlock).toHaveBeenCalledWith(
      'clarification-321',
      expect.objectContaining({
        type: 'clarification',
        status: 'submitted',
        answers: { direction: 'option_a' },
      }),
    )
    expect(sendOrApprove).toHaveBeenCalledWith('Which direction should I take?: Option A')
    expect(flowClarificationMocks.dispatchFlowClarificationAnswer).not.toHaveBeenCalled()
  })

  it('routes flow-sourced clarification answers to the Flow build session instead of chat', () => {
    const sendOrApprove = vi.fn()
    const flowBlock: MessageContentBlock = {
      ...clarificationBlock,
      id: 'clarification-flow-1',
      source: 'flow',
    }
    render(<PartBHarness block={flowBlock} ctx={createContext({ sendOrApprove })} />)

    fireEvent.click(screen.getByRole('button', { name: /Option B/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(flowClarificationMocks.dispatchFlowClarificationAnswer).toHaveBeenCalledWith({
      answers: { direction: 'option_b' },
      questions: flowBlock.type === 'clarification' ? flowBlock.questions : [],
    })
    expect(sendOrApprove).not.toHaveBeenCalled()
  })
})
