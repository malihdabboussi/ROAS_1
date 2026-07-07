import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChannelSettingsModal } from './ChannelSettingsModal'

const channel = {
  id: 'channel-a',
  org_id: 'org-1',
  user_id: 'user-1',
  name: 'alpha',
  description: 'Old description',
  is_private: false,
  metadata: null,
  created_at: '2026-06-24T00:00:00.000Z',
  updated_at: '2026-06-24T00:00:00.000Z',
}

describe('ChannelSettingsModal', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('initializes from the channel and saves the edited payload', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const onOpenChange = vi.fn()

    render(
      <ChannelSettingsModal
        open
        onOpenChange={onOpenChange}
        channel={channel}
        onSave={onSave}
      />,
    )

    const description = screen.getByLabelText(/description/i)
    expect((description as HTMLTextAreaElement).value).toBe('Old description')

    fireEvent.change(description, { target: { value: '  Updated purpose  ' } })
    fireEvent.click(screen.getByRole('radio', { name: /private/i }))
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        description: 'Updated purpose',
        is_private: true,
      })
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('keeps the modal open and shows an error when save fails', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Nope'))
    const onOpenChange = vi.fn()

    render(
      <ChannelSettingsModal
        open
        onOpenChange={onOpenChange}
        channel={channel}
        onSave={onSave}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    expect(await screen.findByText('Nope')).not.toBeNull()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })
})
