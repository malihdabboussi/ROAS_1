import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NewCampaignModal } from './NewCampaignModal'

vi.mock('@/components/ui/IconPicker', () => ({
  IconPicker: () => <button type="button">Choose campaign icon</button>,
}))

afterEach(cleanup)

describe('NewCampaignModal', () => {
  it('uses campaign terminology and accessible dialog behavior', () => {
    const onClose = vi.fn()
    render(<NewCampaignModal open onClose={onClose} onCreate={vi.fn()} />)

    expect(screen.getByRole('dialog', { name: 'CREATE CAMPAIGN' })).toHaveAccessibleDescription(
      'Choose a name and icon for the campaign.',
    )
    expect(screen.getByRole('textbox', { name: 'Campaign name' })).not.toBeNull()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('submits a trimmed campaign name', () => {
    const onCreate = vi.fn()
    render(<NewCampaignModal open onClose={vi.fn()} onCreate={onCreate} />)

    fireEvent.change(screen.getByRole('textbox', { name: 'Campaign name' }), {
      target: { value: '  Launch  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect(onCreate).toHaveBeenCalledWith('Launch', 'folder-kanban')
  })
})
