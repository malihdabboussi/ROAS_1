import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import type { ChannelMessage } from '@/lib/channels'
import type { MissionDeliverable } from '@/lib/missions'
import { ChannelMessageBubble } from './ChannelMessageBubble'

const retryAgentInvocation = vi.hoisted(() => vi.fn())
const toastSuccess = vi.hoisted(() => vi.fn())
const toastError = vi.hoisted(() => vi.fn())

vi.mock('sonner', () => ({
  toast: {
    error: toastError,
    success: toastSuccess,
  },
}))

vi.mock('@/components/vibey/vibey-chat-orb', () => ({
  VibeyChatOrb: ({ state }: { state: string }) => <span data-testid="vibey-chat-orb">{state}</span>,
}))

vi.mock('@/components/vibey/vibey-hero-depth-orb', () => ({
  VibeyHeroDepthOrbEmbed: () => <span data-testid="system-orb" />,
}))

vi.mock('@/components/chat/FileAttachments', () => ({
  PersistedFileChips: ({
    documents,
  }: {
    documents: Array<{ filename: string; fileUrl?: string }>
  }) => <div data-testid="persisted-file-chips">{documents.map((doc) => doc.filename).join(',')}</div>,
}))

vi.mock('@/components/chat/GeneratedMedia', () => ({
  GeneratedAudio: ({ url, prompt }: { url: string; prompt?: string }) => (
    <div data-testid="generated-audio" data-url={url}>
      {prompt}
    </div>
  ),
  GeneratedImage: ({ url, prompt }: { url: string; prompt?: string }) => (
    <div data-testid="generated-image" data-url={url}>
      {prompt}
    </div>
  ),
  GeneratedVideo: ({ url, prompt }: { url: string; prompt?: string }) => (
    <div data-testid="generated-video" data-url={url}>
      {prompt}
    </div>
  ),
}))

vi.mock('@/components/chat/PdfCard', () => ({
  PdfCard: ({ url, label }: { url: string; label: string }) => (
    <div data-testid="pdf-card" data-url={url}>
      {label}
    </div>
  ),
}))

vi.mock('@/components/chat/ChatMarkdownView', () => ({
  ChatMarkdownView: ({ html }: { html: string }) => (
    <div data-testid="chat-markdown" dangerouslySetInnerHTML={{ __html: html }} />
  ),
}))

vi.mock('@/lib/channels', () => ({
  channelsService: {
    retryAgentInvocation,
  },
}))

vi.mock('./BrandedEmojiPicker', () => ({
  BrandedEmojiPicker: ({
    onEmojiClick,
  }: {
    onEmojiClick: (data: { emoji: string }) => void
  }) => (
    <button type="button" data-testid="emoji-picker" onClick={() => onEmojiClick({ emoji: 'spark' })}>
      Emoji picker
    </button>
  ),
}))

vi.mock('./ChannelOrderedBlocks', () => ({
  ChannelOrderedBlocks: ({
    blocks,
    onOpenDeliverablePreview,
  }: {
    blocks: Array<{ id: string }>
    onOpenDeliverablePreview?: (deliverable: MissionDeliverable) => void
  }) => (
    <button
      type="button"
      data-testid="ordered-blocks"
      onClick={() =>
        onOpenDeliverablePreview?.({
          id: 'deliverable-1',
          mission_id: 'mission-1',
          user_id: 'user-1',
          agent_key: 'atlas',
          type: 'doc',
          title: 'Brief',
          content: null,
          file_url: null,
          file_name: null,
          file_size: null,
          mime_type: null,
          metadata: {},
          created_at: '2026-06-28T10:00:00.000Z',
        })
      }
    >
      {blocks.length} ordered blocks
    </button>
  ),
}))

function message(overrides: Partial<ChannelMessage> = {}): ChannelMessage {
  return {
    id: 'msg-1',
    channel_id: 'channel-1',
    sender_type: 'user',
    sender_id: 'user-1',
    content: 'Launch note',
    content_blocks: null,
    metadata: null,
    reply_to_id: null,
    thread_name: null,
    pinned: false,
    pinned_by: null,
    created_at: '2026-06-28T10:00:00.000Z',
    updated_at: '2026-06-28T10:00:00.000Z',
    ...overrides,
  }
}

function renderBubble(overrides: Partial<ComponentProps<typeof ChannelMessageBubble>> = {}) {
  return render(
    <ChannelMessageBubble
      message={message()}
      senderLabel="Jordan Lee"
      avatarUrl={null}
      currentUserId="user-1"
      onEdit={vi.fn().mockResolvedValue(undefined)}
      onDelete={vi.fn().mockResolvedValue(undefined)}
      {...overrides}
    />,
  )
}

describe('ChannelMessageBubble', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    })
  })

  it('renders body media, attachments, reactions, thread metadata, and settles across rerenders', () => {
    const onOpenThread = vi.fn()
    const mediaMessage = message({
      content: 'Launch hero https://cdn.example.com/hero.png',
      metadata: {
        attachments: ['https://cdn.example.com/brief.pdf'],
      },
    })

    const { container, rerender } = renderBubble({
      message: mediaMessage,
      replyCount: 2,
      replyAvatars: [{ url: null, label: 'Alex Kim' }],
      lastReplyTime: '2026-06-28T10:04:00.000Z',
      onOpenThread,
    })

    expect(screen.getByText('Jordan Lee')).toBeTruthy()
    expect(screen.getByTestId('chat-markdown').textContent).toContain('Launch hero')
    expect(screen.getByTestId('generated-image').getAttribute('data-url')).toBe(
      'https://cdn.example.com/hero.png',
    )
    expect(screen.getByTestId('persisted-file-chips').textContent).toContain('brief.pdf')

    fireEvent.click(screen.getByRole('button', { name: /2 replies/i }))
    expect(onOpenThread).toHaveBeenCalledTimes(1)

    const toolbarButtons = container.querySelectorAll('button')
    fireEvent.click(toolbarButtons[1]!)
    expect(screen.getByText('1')).toBeTruthy()

    rerender(
      <ChannelMessageBubble
        message={mediaMessage}
        senderLabel="Jordan Lee"
        avatarUrl={null}
        currentUserId="user-1"
        replyCount={2}
        replyAvatars={[{ url: null, label: 'Alex Kim' }]}
        lastReplyTime="2026-06-28T10:04:00.000Z"
        onOpenThread={onOpenThread}
        onEdit={vi.fn().mockResolvedValue(undefined)}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    expect(screen.getByTestId('generated-image')).toBeTruthy()
  })

  it('handles own-message edit, copy, delete, and custom emoji actions', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    const onEdit = vi.fn().mockResolvedValue(undefined)
    const onDelete = vi.fn().mockResolvedValue(undefined)
    const { container } = renderBubble({
      message: message({ content: '<p>Original</p>' }),
      onEdit,
      onDelete,
    })

    let toolbarButtons = Array.from(container.querySelectorAll('button'))
    fireEvent.click(toolbarButtons.at(-2)!)
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Updated' } })
    fireEvent.keyDown(textarea, { key: 'Enter' })
    await waitFor(() => expect(onEdit).toHaveBeenCalledWith('msg-1', 'Updated'))

    toolbarButtons = Array.from(container.querySelectorAll('button'))
    fireEvent.click(toolbarButtons.at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: /Copy message/i }))
    expect(writeText).toHaveBeenCalledWith('Original')
    expect(toastSuccess).toHaveBeenCalledWith('Copied')

    toolbarButtons = Array.from(container.querySelectorAll('button'))
    fireEvent.click(toolbarButtons.at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: /Delete message/i }))
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('msg-1'))

    toolbarButtons = Array.from(container.querySelectorAll('button'))
    fireEvent.click(toolbarButtons[4]!)
    fireEvent.click(screen.getByTestId('emoji-picker'))
    expect(screen.getByText('spark')).toBeTruthy()
  })

  it('positions action and emoji portals from their trigger rectangles', () => {
    const { container } = renderBubble()
    const toolbarButtons = Array.from(container.querySelectorAll('button'))
    const emojiButton = toolbarButtons[4]!
    const menuButton = toolbarButtons.at(-1)!

    vi.spyOn(menuButton, 'getBoundingClientRect').mockReturnValue({
      top: 180,
      left: 456,
      bottom: 204,
      right: 520,
      width: 64,
      height: 24,
      x: 456,
      y: 180,
      toJSON: () => ({}),
    })

    fireEvent.click(menuButton)
    const menu = document.body.querySelector('.dropdown-menu-solid') as HTMLElement | null
    expect(menu?.getAttribute('style')).toContain('top: 208px;')
    expect(menu?.getAttribute('style')).toContain('left: 340px;')

    fireEvent.mouseDown(document.body)
    vi.spyOn(emojiButton, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      left: 276,
      bottom: 124,
      right: 340,
      width: 64,
      height: 24,
      x: 276,
      y: 100,
      toJSON: () => ({}),
    })

    fireEvent.click(emojiButton)
    const emojiPortal = screen.getByTestId('emoji-picker').parentElement
    expect(emojiPortal?.getAttribute('style')).toContain('top: 132px;')
    expect(emojiPortal?.getAttribute('style')).toContain('left: 340px;')
    expect(emojiPortal?.getAttribute('style')).toContain('transform: translateX(-100%);')
  })

  it('delegates ordered blocks and failed agent retries', async () => {
    retryAgentInvocation.mockResolvedValue({ accepted: true })
    const onOpenDeliverablePreview = vi.fn()
    renderBubble({
      message: message({
        sender_type: 'agent',
        sender_id: 'atlas',
        metadata: {
          agent_status: { atlas: 'failed' },
          content_blocks_ordered: [
            {
              id: 'block-1',
              type: 'text',
              content: 'Final answer',
            },
          ],
        },
      }),
      senderLabel: 'atlas',
      currentUserId: 'user-1',
      onOpenDeliverablePreview,
    })

    fireEvent.click(screen.getByTestId('ordered-blocks'))
    expect(onOpenDeliverablePreview).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'deliverable-1' }),
    )

    fireEvent.click(screen.getByRole('button', { name: /Retry/i }))
    await waitFor(() =>
      expect(retryAgentInvocation).toHaveBeenCalledWith('channel-1', 'msg-1', 'atlas'),
    )
  })
})
