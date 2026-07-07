import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BrainScopeNavOption } from './use-brain-scope-nav-options'
import { useBrainVisualizationScopeSelection } from './use-brain-visualization-scope-selection'

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

function renderScopeSelection({
  scope = 'user',
  scopeOptions = [scopeOption()],
  scopeOptionsResolved = true,
  scopesLoading = false,
}: {
  scope?: string | null
  scopeOptions?: BrainScopeNavOption[]
  scopeOptionsResolved?: boolean
  scopesLoading?: boolean
} = {}) {
  const router = {
    push: vi.fn(),
    replace: vi.fn(),
  }
  const searchParams = new URLSearchParams(scope == null ? '' : `scope=${scope}`)

  return {
    ...renderHook(() =>
      useBrainVisualizationScopeSelection({
        router,
        searchParams,
        scopeOptions,
        scopeOptionsResolved,
        scopesLoading,
      }),
    ),
    router,
  }
}

describe('useBrainVisualizationScopeSelection', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('selects the scope from the URL and exposes the matching option', async () => {
    const agentScope = scopeOption({
      id: 'agent:atlas',
      label: 'Atlas',
      agentId: 'atlas',
      brainId: 'brain-atlas',
      scopeType: 'agent',
    })

    const { result, router } = renderScopeSelection({
      scope: 'agent:atlas',
      scopeOptions: [scopeOption(), agentScope],
    })

    await waitFor(() => {
      expect(result.current.selectedScopeId).toBe('agent:atlas')
      expect(result.current.selectedScope?.label).toBe('Atlas')
      expect(result.current.brainScopeRuntime.ready).toBe(true)
      expect(result.current.brainScopeRuntime.graphBrainId).toBe('brain-atlas')
    })
    expect(router.replace).not.toHaveBeenCalled()
  })

  it('redirects invalid resolved scopes back to Brain Home and falls back to user scope', async () => {
    const { result, router } = renderScopeSelection({
      scope: 'missing-scope',
      scopeOptions: [scopeOption()],
    })

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/brain', { scroll: false })
      expect(result.current.selectedScopeId).toBe('user')
      expect(result.current.selectedScope?.id).toBe('user')
    })
  })

  it('defers invalid-scope replacement while scope options are still loading', () => {
    const { result, router } = renderScopeSelection({
      scope: 'agent:pending',
      scopeOptions: [scopeOption()],
      scopesLoading: true,
    })

    expect(result.current.selectedScopeId).toBe('agent:pending')
    expect(result.current.selectedScope?.id).toBe('user')
    expect(router.replace).not.toHaveBeenCalled()
  })

  it('navigates back to Brain Home through the router callback', () => {
    const { result, router } = renderScopeSelection()

    result.current.navigateToBrainHome()

    expect(router.push).toHaveBeenCalledWith('/brain')
  })
})
