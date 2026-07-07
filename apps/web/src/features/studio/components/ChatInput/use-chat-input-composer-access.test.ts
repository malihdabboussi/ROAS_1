import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComposerAccessRow, ComposerPolicy } from './chat-input-policy'
import { useChatInputComposerAccess } from './use-chat-input-composer-access'

function policy(): ComposerPolicy {
  return {
    grants: [{ kind: 'action_domain', id: 'read_campaign' }],
    overrides: { allow_extra: [], deny: [] },
  }
}

function accessRow(): ComposerAccessRow {
  return {
    kind: 'action_domain',
    id: 'read_campaign',
    label: 'Read campaign data',
    description: 'Read campaigns.',
  }
}

function defaultOptions(overrides: Partial<Parameters<typeof useChatInputComposerAccess>[0]> = {}) {
  const fetchJson = vi.fn((path: string) => {
    if (path.endsWith('/overrides')) {
      return Promise.resolve([{ capability_kind: 'skill', capability_id: 'brief', mode: 'deny' }])
    }
    if (path.endsWith('/policy')) {
      return Promise.resolve(policy())
    }
    if (path === '/api/integrations/overview') {
      return Promise.resolve({
        success: true,
        connectedProviders: ['stripe'],
        providerModes: { stripe: 'oauth' },
        integrations: [
          {
            integration_id: 'stripe',
            provider: 'stripe',
            status: 'connected',
            agent_enabled: true,
          },
        ],
      })
    }
    return Promise.resolve(null)
  })
  return {
    agentKey: 'lux',
    openPlusSubmenuPosition: vi.fn(),
    fetchJson,
    patchJson: vi.fn(() => Promise.resolve({})),
    postJson: vi.fn(() => Promise.resolve({ authorizeUrl: 'https://connect.example/stripe' })),
    putJson: vi.fn(() => Promise.resolve({})),
    loadCached: vi.fn((_key: string, fetcher: () => Promise<unknown>) => fetcher()),
    invalidateCache: vi.fn(),
    showError: vi.fn(),
    getCurrentHref: () => 'https://app.example/studio',
    setWindowLocation: vi.fn(),
    ...overrides,
  }
}

describe('useChatInputComposerAccess', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it('does not load integration overview or denied skill overrides on mount', () => {
    const options = defaultOptions()
    renderHook(() => useChatInputComposerAccess(options))

    expect(options.loadCached).not.toHaveBeenCalled()
    expect(options.fetchJson).not.toHaveBeenCalled()
  })

  it('loads integration overview and denied skill overrides only when their submenus open', async () => {
    const options = defaultOptions()
    const { result } = renderHook(() => useChatInputComposerAccess(options))

    act(() => result.current.openPlusSubmenu('integrations'))
    await waitFor(() => expect(result.current.connectedProviders).toEqual(['stripe']))
    expect(result.current.connectedProviders).toEqual(['stripe'])
    expect(result.current.agentToggles).toEqual([
      {
        integration_id: 'stripe',
        provider: 'stripe',
        status: 'connected',
        agent_enabled: true,
      },
    ])
    expect(result.current.suggestedUnconnected).not.toContain('stripe')

    act(() => result.current.openPlusSubmenu('skills'))
    await waitFor(() => expect(result.current.skillDenyKeys.has('brief')).toBe(true))
    expect(options.loadCached).toHaveBeenCalledWith('integrations-overview', expect.any(Function), {
      ttlMs: 120_000,
    })
    expect(options.loadCached).toHaveBeenCalledWith(
      'agent-team-overrides:lux',
      expect.any(Function),
      { ttlMs: 300_000 },
    )
  })

  it('opens the access submenu and lazy-loads composer policy', async () => {
    const options = defaultOptions()
    const { result } = renderHook(() => useChatInputComposerAccess(options))

    act(() => result.current.openPlusSubmenu('access'))

    expect(options.openPlusSubmenuPosition).toHaveBeenCalledWith('access')
    await waitFor(() => expect(result.current.composerPolicy).toEqual(policy()))
    expect(result.current.composerPolicyLoading).toBe(false)
  })

  it('merges protected system access into composer policy and keeps it read-only', async () => {
    const options = defaultOptions({
      agentKey: 'user-123e4567-e89b-42d3-a456-426614174000-vibey',
      fetchJson: vi.fn((path: string) => {
        if (path.endsWith('/policy')) {
          return Promise.resolve({ grants: [], overrides: { allow_extra: [], deny: [] } })
        }
        return Promise.resolve([])
      }),
    })
    const { result } = renderHook(() => useChatInputComposerAccess(options))

    act(() => result.current.openPlusSubmenu('access'))
    await waitFor(() =>
      expect(result.current.composerPolicy?.locked_defaults).toContainEqual({
        kind: 'action_domain',
        id: 'read_campaign',
      }),
    )
    await act(async () => {
      await result.current.handleAccessToggle(accessRow(), false)
    })

    expect(options.putJson).not.toHaveBeenCalled()
  })

  it('keeps non-default access rows read-only for protected system agents', async () => {
    const options = defaultOptions({
      agentKey: 'loop',
      fetchJson: vi.fn((path: string) => {
        if (path.endsWith('/policy')) {
          return Promise.resolve({ grants: [], overrides: { allow_extra: [], deny: [] } })
        }
        return Promise.resolve([])
      }),
    })
    const { result } = renderHook(() => useChatInputComposerAccess(options))

    act(() => result.current.openPlusSubmenu('access'))
    await waitFor(() => expect(result.current.composerAccessReadOnly).toBe(true))
    await act(async () => {
      await result.current.handleAccessToggle(
        {
          kind: 'action_domain',
          id: 'generate_media',
          label: 'Generate media',
          description: 'Generate images and videos.',
        },
        true,
      )
    })

    expect(options.putJson).not.toHaveBeenCalled()
  })

  it('rolls back a failed skill toggle and reports the existing error copy', async () => {
    const options = defaultOptions({
      postJson: vi.fn(() => Promise.reject(new Error('failed'))),
    })
    const { result } = renderHook(() => useChatInputComposerAccess(options))

    act(() => result.current.openPlusSubmenu('skills'))
    await waitFor(() => expect(result.current.skillDenyKeys.has('brief')).toBe(true))
    await act(async () => {
      await result.current.handleSkillToggle('brief', true)
    })

    expect(options.postJson).toHaveBeenCalledWith(
      '/api/agent-teams/agents/lux/skill-overrides/brief',
      { enabled: true },
    )
    expect(result.current.skillDenyKeys.has('brief')).toBe(true)
    expect(options.showError).toHaveBeenCalledWith('Could not update skill access.')
  })

  it('persists access overrides from inherited to denied state', async () => {
    const options = defaultOptions()
    const { result } = renderHook(() => useChatInputComposerAccess(options))

    act(() => result.current.openPlusSubmenu('access'))
    await waitFor(() => expect(result.current.composerPolicy).toEqual(policy()))
    await act(async () => {
      await result.current.handleAccessToggle(accessRow(), false)
    })

    expect(options.putJson).toHaveBeenCalledWith('/api/agent-teams/agents/lux/overrides', {
      overrides: [{ kind: 'action_domain', id: 'read_campaign', mode: 'deny' }],
    })
    expect(result.current.composerPolicy?.overrides.deny).toEqual([
      { kind: 'action_domain', id: 'read_campaign' },
    ])
    expect(result.current.composerPolicyPending).toBeNull()
  })

  it('starts known integration connections with the existing redirect contract', async () => {
    const options = defaultOptions()
    const { result } = renderHook(() => useChatInputComposerAccess(options))

    await act(async () => {
      await result.current.handleConnectIntegration('stripe')
    })

    expect(options.postJson).toHaveBeenCalledWith('/api/integrations/stripe/connect', {
      redirectTo: 'https://app.example/studio',
    })
    expect(options.setWindowLocation).toHaveBeenCalledWith('https://connect.example/stripe')
  })
})
