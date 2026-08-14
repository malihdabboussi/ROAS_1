import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAgentTurnFeedback } from './use-agent-turn-feedback'

const apiMocks = vi.hoisted(() => ({
  lookupAgentTurnFeedback: vi.fn(),
  saveAgentTurnFeedback: vi.fn(),
}))

vi.mock('./agent-feedback-api', () => apiMocks)

afterEach(() => {
  vi.clearAllMocks()
})

describe('useAgentTurnFeedback', () => {
  it('does not trigger a synchronous loading render for each mounted message', () => {
    apiMocks.lookupAgentTurnFeedback.mockImplementation(() => new Promise(() => undefined))
    let renderCount = 0

    function Probe() {
      renderCount += 1
      useAgentTurnFeedback({
        targetKind: 'conversation_message',
        targetId: '33333333-3333-4333-8333-333333333333',
        sourceSurface: 'studio_chat',
      })
      return null
    }

    render(<Probe />)

    expect(renderCount).toBe(1)
    expect(apiMocks.lookupAgentTurnFeedback).toHaveBeenCalledTimes(1)
  })
})
