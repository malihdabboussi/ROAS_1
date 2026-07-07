import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getChatCreditsExhausted,
  setChatCreditsExhausted,
  subscribeChatCreditsExhausted,
} from './chat-credit-state'

describe('chat credit state', () => {
  beforeEach(() => {
    setChatCreditsExhausted(false)
  })

  it('stores the current credit exhaustion state and notifies subscribers on changes', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeChatCreditsExhausted(listener)

    setChatCreditsExhausted(true)

    expect(getChatCreditsExhausted()).toBe(true)
    expect(listener).toHaveBeenCalledWith(true)

    setChatCreditsExhausted(true)
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    setChatCreditsExhausted(false)

    expect(getChatCreditsExhausted()).toBe(false)
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
