import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  WorkspaceSettingsModalProvider,
  useWorkspaceSettingsModal,
} from './workspace-settings-modal-context'

describe('workspace settings modal context', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens a requested section, tracks integration focus, consumes focus, and closes', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <WorkspaceSettingsModalProvider>{children}</WorkspaceSettingsModalProvider>
    )
    const { result } = renderHook(() => useWorkspaceSettingsModal(), { wrapper })

    expect(result.current.isOpen).toBe(false)
    expect(result.current.initialSection).toBe('properties')
    expect(result.current.integrationsFocusIntegrationId).toBeNull()

    act(() =>
      result.current.openWorkspaceSettings('integrations', {
        integrationsFocusIntegrationId: 'meta',
      }),
    )
    expect(result.current.isOpen).toBe(true)
    expect(result.current.initialSection).toBe('integrations')
    expect(result.current.integrationsFocusIntegrationId).toBe('meta')

    act(() => result.current.consumeIntegrationsFocusIntegrationId())
    expect(result.current.integrationsFocusIntegrationId).toBeNull()

    act(() => result.current.closeWorkspaceSettings())
    expect(result.current.isOpen).toBe(false)
    expect(result.current.integrationsFocusIntegrationId).toBeNull()
  })

  it('requires the provider before using the hook', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => renderHook(() => useWorkspaceSettingsModal())).toThrow(
      'useWorkspaceSettingsModal must be used within WorkspaceSettingsModalProvider',
    )
  })
})
