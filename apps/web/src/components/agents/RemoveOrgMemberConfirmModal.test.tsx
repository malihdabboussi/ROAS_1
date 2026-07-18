import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RemoveOrgMemberConfirmModal } from './RemoveOrgMemberConfirmModal'

afterEach(cleanup)

describe('RemoveOrgMemberConfirmModal', () => {
  it('is a named dismissible confirmation dialog', () => {
    const onClose = vi.fn()
    render(
      <RemoveOrgMemberConfirmModal
        open
        displayName="Mira"
        removing={false}
        onClose={onClose}
        onConfirm={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('dialog', { name: 'Remove from organization?' }),
    ).toHaveAccessibleDescription(
      'Mira will lose access to this organization. This cannot be undone.',
    )
    expect(screen.getByRole('textbox', { name: 'Type Mira to confirm' })).not.toBeNull()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })
})
