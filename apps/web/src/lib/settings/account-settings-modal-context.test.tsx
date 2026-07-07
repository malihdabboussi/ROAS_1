import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AccountSettingsModalProvider,
  useAccountSettingsModal,
} from './account-settings-modal-context'

describe('account settings modal context', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens a requested section and closes the modal', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AccountSettingsModalProvider>{children}</AccountSettingsModalProvider>
    )
    const { result } = renderHook(() => useAccountSettingsModal(), { wrapper })

    expect(result.current.isOpen).toBe(false)
    expect(result.current.initialSection).toBe('profile')

    act(() => result.current.openAccountSettings('billing'))
    expect(result.current.isOpen).toBe(true)
    expect(result.current.initialSection).toBe('billing')

    act(() => result.current.closeAccountSettings())
    expect(result.current.isOpen).toBe(false)
    expect(result.current.initialSection).toBe('billing')
  })

  it('requires the provider before using the hook', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => renderHook(() => useAccountSettingsModal())).toThrow(
      'useAccountSettingsModal must be used within AccountSettingsModalProvider',
    )
  })
})
