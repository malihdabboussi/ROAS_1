import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestBrainSidebarVoice } from '../lib/brain-sidebar-voice'
import { dispatchBrainTrainModal } from '../lib/brain-training-modal.events'
import type { BrainScopeNavOption } from './use-brain-scope-nav-options'
import { useBrainVisualizationActions } from './use-brain-visualization-actions'

vi.mock('../lib/brain-training-modal.events', () => ({
  dispatchBrainTrainModal: vi.fn(),
}))

vi.mock('../lib/brain-sidebar-voice', () => ({
  requestBrainSidebarVoice: vi.fn(),
}))

const dispatchBrainTrainModalMock = vi.mocked(dispatchBrainTrainModal)
const requestBrainSidebarVoiceMock = vi.mocked(requestBrainSidebarVoice)

function scopeOption(overrides: Partial<BrainScopeNavOption> = {}): BrainScopeNavOption {
  return {
    id: 'user',
    label: 'Your Brain',
    agentId: null,
    brainId: 'brain-user',
    scopeType: 'user',
    ...overrides,
  }
}

function renderActionsHook({
  action,
  selectedScope = scopeOption(),
  selectedScopeId = 'user',
  topRightScopeReady = true,
}: {
  action?: string
  selectedScope?: BrainScopeNavOption
  selectedScopeId?: string
  topRightScopeReady?: boolean
} = {}) {
  const replace = vi.fn()
  const router = { replace }
  const searchParams = new URLSearchParams(`scope=${selectedScopeId}${action ? `&action=${action}` : ''}`)

  return {
    ...renderHook(() =>
      useBrainVisualizationActions({
        router,
        searchParams,
        selectedScope,
        selectedScopeId,
        topRightScopeReady,
      }),
    ),
    replace,
  }
}

describe('useBrainVisualizationActions', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('dispatches the train modal and clears a valid train URL action', async () => {
    const { replace } = renderActionsHook({ action: 'train' })

    await waitFor(() => {
      expect(dispatchBrainTrainModalMock).toHaveBeenCalledWith({ scopeId: 'user' })
      expect(replace).toHaveBeenCalledWith('/brain?scope=user', { scroll: false })
    })
  })

  it('routes voice URL actions into sidebar chat voice', async () => {
    const { replace } = renderActionsHook({ action: 'voice' })

    await waitFor(() => {
      expect(requestBrainSidebarVoiceMock).toHaveBeenCalledWith(null)
      expect(replace).toHaveBeenCalledWith('/brain?scope=user', { scroll: false })
    })
  })

  it('dispatches mobile add-info URL actions without requiring a brain id', async () => {
    const mobileAddInfo = vi.fn()
    window.addEventListener('mobile-brain-add-info', mobileAddInfo)

    try {
      const { replace } = renderActionsHook({
        action: 'add-info',
        selectedScope: scopeOption({ brainId: null }),
      })

      await waitFor(() => {
        expect(mobileAddInfo).toHaveBeenCalledTimes(1)
        expect(replace).toHaveBeenCalledWith('/brain?scope=user', { scroll: false })
      })
    } finally {
      window.removeEventListener('mobile-brain-add-info', mobileAddInfo)
    }
  })

  it('clears supported modal URL actions that cannot open without a brain id', async () => {
    const { result, replace } = renderActionsHook({
      action: 'cortex-max',
      selectedScope: scopeOption({ brainId: null }),
    })

    await waitFor(() => {
      expect(result.current.cortexMaxOpen).toBe(false)
      expect(replace).toHaveBeenCalledWith('/brain?scope=user', { scroll: false })
    })
  })

  it('ignores unsupported or not-ready URL actions without replacing the URL', () => {
    const unsupported = renderActionsHook({ action: 'missing-action' })
    expect(unsupported.replace).not.toHaveBeenCalled()

    const notReady = renderActionsHook({ action: 'train', topRightScopeReady: false })
    expect(notReady.replace).not.toHaveBeenCalled()
    expect(dispatchBrainTrainModalMock).not.toHaveBeenCalled()
  })
})
