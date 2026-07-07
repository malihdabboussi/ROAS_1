import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DangerSettingsSection } from './danger-settings-section'

afterEach(cleanup)

function renderDangerSettings(
  overrides: Partial<Parameters<typeof DangerSettingsSection>[0]> = {},
) {
  const props = {
    activeCampaignName: 'Launch Campaign',
    deleteDialogOpen: false,
    deleteCampaignAck: false,
    deleteCampaignNameInput: '',
    isDeletingCampaign: false,
    setDeleteDialogOpen: vi.fn(),
    setDeleteCampaignAck: vi.fn(),
    setDeleteCampaignNameInput: vi.fn(),
    onDeleteCampaign: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }

  render(<DangerSettingsSection {...props} />)
  return props
}

describe('DangerSettingsSection', () => {
  it('opens the confirmation dialog and resets confirmation state', () => {
    const props = renderDangerSettings()

    fireEvent.click(screen.getByRole('button', { name: 'Delete Campaign' }))

    expect(props.setDeleteDialogOpen).toHaveBeenCalledWith(true)
    expect(props.setDeleteCampaignAck).toHaveBeenCalledWith(false)
    expect(props.setDeleteCampaignNameInput).toHaveBeenCalledWith('')
  })

  it('keeps the confirmation gates and delegates confirmed deletion', () => {
    const blockedProps = renderDangerSettings({
      deleteDialogOpen: true,
      deleteCampaignAck: false,
      deleteCampaignNameInput: 'Launch Campaign',
    })

    expect((screen.getByRole('button', { name: 'Delete Campaign' }) as HTMLButtonElement).disabled)
      .toBe(true)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(blockedProps.setDeleteCampaignAck).toHaveBeenCalledWith(true)

    fireEvent.change(screen.getByPlaceholderText('Launch Campaign'), {
      target: { value: 'Renamed Campaign' },
    })
    expect(blockedProps.setDeleteCampaignNameInput).toHaveBeenCalledWith('Renamed Campaign')

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(blockedProps.setDeleteDialogOpen).toHaveBeenCalledWith(false)

    cleanup()
    const confirmedProps = renderDangerSettings({
      deleteDialogOpen: true,
      deleteCampaignAck: true,
      deleteCampaignNameInput: 'Launch Campaign',
    })

    fireEvent.click(screen.getByRole('button', { name: 'Delete Campaign' }))
    expect(confirmedProps.onDeleteCampaign).toHaveBeenCalledTimes(1)
  })
})
