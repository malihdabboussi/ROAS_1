import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  COMPOSER_TRY_TIP_MESSAGES,
  COMPOSER_TRY_TIP_ROTATE_MS,
  COMPOSER_TRY_TIPS,
  composerTryTipRotationSeed,
  pickComposerTryTip,
} from '@/lib/chat/composer-try-tips'
import { ChatComposerTryTip } from './ChatComposerTryTip'

const mocks = vi.hoisted(() => ({
  seedComposer: vi.fn(),
  dismissedIds: [] as string[],
  addDismissedId: vi.fn((id: string) => {
    mocks.dismissedIds = [...mocks.dismissedIds, id]
    return mocks.dismissedIds
  }),
}))

vi.mock('@/components/global-chat/store/use-global-chat-store', () => ({
  useGlobalChatStore: (selector: (state: { seedComposer: typeof mocks.seedComposer }) => unknown) =>
    selector({ seedComposer: mocks.seedComposer }),
}))

vi.mock('@/components/global-chat/lib/global-chat-storage', () => ({
  readTryTipDismissedIds: () => mocks.dismissedIds,
  addTryTipDismissedId: (id: string) => mocks.addDismissedId(id),
}))

describe('ChatComposerTryTip', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    mocks.dismissedIds = []
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('opens the current tip as a new Pixel task', () => {
    const tip = pickComposerTryTip([], 0)
    expect(tip).not.toBeNull()
    render(<ChatComposerTryTip />)

    fireEvent.click(screen.getByRole('button', { name: COMPOSER_TRY_TIP_MESSAGES.try }))

    expect(mocks.seedComposer).toHaveBeenCalledWith({
      content: tip!.prompt,
      railIntent: 'new',
      seedMode: tip!.seedMode,
    })
    expect(mocks.addDismissedId).toHaveBeenCalledWith(tip!.id)
  })

  it('hides the banner after dismiss instead of showing the next tip', () => {
    const seed = composerTryTipRotationSeed('chat-a')
    const first = pickComposerTryTip([], seed)
    const next = pickComposerTryTip([first!.id], seed)
    render(<ChatComposerTryTip conversationId="chat-a" />)

    fireEvent.click(screen.getByRole('button', { name: COMPOSER_TRY_TIP_MESSAGES.dismiss }))

    expect(mocks.addDismissedId).toHaveBeenCalledWith(first!.id)
    expect(mocks.seedComposer).not.toHaveBeenCalled()
    expect(screen.queryByText(first!.body)).toBeNull()
    expect(screen.queryByText(next!.body)).toBeNull()
  })

  it('still shows a remaining tip in a different chat after dismiss', () => {
    const { rerender } = render(<ChatComposerTryTip conversationId="chat-a" />)

    fireEvent.click(screen.getByRole('button', { name: COMPOSER_TRY_TIP_MESSAGES.dismiss }))
    expect(screen.queryByText(COMPOSER_TRY_TIP_MESSAGES.badge)).toBeNull()

    rerender(<ChatComposerTryTip conversationId="chat-b" />)
    const other = pickComposerTryTip(mocks.dismissedIds, composerTryTipRotationSeed('chat-b'))
    expect(other).not.toBeNull()
    expect(screen.getByText(other!.body)).toBeInTheDocument()
  })

  it('keeps the banner hidden when returning to the dismissed chat', () => {
    const { rerender } = render(<ChatComposerTryTip conversationId="chat-a" />)

    fireEvent.click(screen.getByRole('button', { name: COMPOSER_TRY_TIP_MESSAGES.dismiss }))
    rerender(<ChatComposerTryTip conversationId="chat-b" />)
    rerender(<ChatComposerTryTip conversationId="chat-a" />)

    expect(screen.queryByText(COMPOSER_TRY_TIP_MESSAGES.badge)).toBeNull()
  })

  it('alternates remaining tips on an interval', () => {
    vi.useFakeTimers()
    const first = pickComposerTryTip([], 0)
    const next = pickComposerTryTip([], 1)
    render(<ChatComposerTryTip />)

    expect(screen.getByText(first!.body)).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(COMPOSER_TRY_TIP_ROTATE_MS)
    })
    expect(screen.getByText(next!.body)).toBeInTheDocument()
  })

  it('hides the banner when every tip has been dismissed', () => {
    mocks.dismissedIds = COMPOSER_TRY_TIPS.map((tip) => tip.id)
    render(<ChatComposerTryTip />)
    expect(screen.queryByText(COMPOSER_TRY_TIP_MESSAGES.badge)).toBeNull()
  })
})
