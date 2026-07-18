import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AccountSettingsModal } from './AccountSettingsModal'
import { WorkspaceSettingsModal } from './WorkspaceSettingsModal'

let mobile = false

vi.mock('next/dynamic', () => ({
  default: () =>
    function DynamicSettingsContent() {
      return <div>Settings content</div>
    },
}))

vi.mock('@/hooks/use-user-role', () => ({
  useUserRole: () => ({ role: 'owner' }),
}))

vi.mock('@/features/org/store/use-org-store', () => ({
  useOrgStore: () => ({
    activeOrgId: 'org-1',
    hasMinRole: () => true,
    isOrgOnly: false,
  }),
}))

describe('settings modal accessibility', () => {
  beforeEach(() => {
    mobile = false
    vi.stubGlobal('matchMedia', () => ({
      matches: mobile,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('describes and names the desktop settings dialogs', () => {
    const { rerender } = render(<WorkspaceSettingsModal open onClose={vi.fn()} />)
    const workspaceDialog = screen.getByRole('dialog', { name: 'Workspace Settings' })
    expect(workspaceDialog.getAttribute('aria-describedby')).toBe(
      screen.getByText('Manage workspace services, intelligence, and communications.').id,
    )
    expect(screen.getByRole('button', { name: 'Close workspace settings' })).toBeTruthy()

    rerender(<AccountSettingsModal open onClose={vi.fn()} />)
    const accountDialog = screen.getByRole('dialog', { name: 'Account Settings' })
    expect(accountDialog.getAttribute('aria-describedby')).toBe(
      screen.getByText('Manage your profile, appearance, billing, and organization.').id,
    )
    expect(screen.getByRole('button', { name: 'Close account settings' })).toBeTruthy()
  })

  it('names collapsed mobile section controls', () => {
    mobile = true
    const { rerender } = render(<WorkspaceSettingsModal open onClose={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Properties' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Integrations' })).toBeTruthy()

    rerender(<AccountSettingsModal open onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Profile' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Appearance' })).toBeTruthy()
  })
})
