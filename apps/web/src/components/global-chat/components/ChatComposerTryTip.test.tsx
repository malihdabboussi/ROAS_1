import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  COMPOSER_TRY_TIP_MESSAGES,
  COMPOSER_TRY_TIP_ROTATE_MS,
  COMPOSER_TRY_TIPS,
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

  it('advances to the next tip after dismiss instead of hiding the banner', () => {
    const first = pickComposerTryTip([], 0)
    const next = pickComposerTryTip([first!.id], 0)
    render(<ChatComposerTryTip />)

    fireEvent.click(screen.getByRole('button', { name: COMPOSER_TRY_TIP_MESSAGES.dismiss }))

    expect(mocks.addDismissedId).toHaveBeenCalledWith(first!.id)
    expect(mocks.seedComposer).not.toHaveBeenCalled()
    expect(screen.getByText(next!.body)).toBeInTheDocument()
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
