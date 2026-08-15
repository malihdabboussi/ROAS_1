import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { COMPOSER_TRY_TIP_MESSAGES, pickComposerTryTip } from '@/lib/chat/composer-try-tips'
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
    mocks.dismissedIds = []
  })

  afterEach(() => {
    cleanup()
  })

  it('opens the current tip as a new Pixel task', () => {
    const tip = pickComposerTryTip([])
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

  it('hides after dismiss and does not seed a task', () => {
    const tip = pickComposerTryTip([])
    render(<ChatComposerTryTip />)

    fireEvent.click(screen.getByRole('button', { name: COMPOSER_TRY_TIP_MESSAGES.dismiss }))

    expect(mocks.addDismissedId).toHaveBeenCalledWith(tip!.id)
    expect(mocks.seedComposer).not.toHaveBeenCalled()
    expect(screen.queryByText(COMPOSER_TRY_TIP_MESSAGES.badge)).toBeNull()
  })
})
