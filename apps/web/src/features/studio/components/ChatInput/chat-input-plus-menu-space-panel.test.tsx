import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatInputPlusMenuSpacePanel } from './chat-input-plus-menu-space-panel'

const spacePicker = {
  selectedCampaignId: null,
  selectedSpaceId: null,
  selectedLabel: 'Choose Space',
  defaultSpaceTitle: 'General',
  isOrgOnly: true,
  groups: [
    {
      programId: 'program-z',
      programName: 'Zulu Program',
      campaignId: 'campaign-1',
      campaignName: 'Client Launch',
      spaces: [{ id: 'space-1', title: 'Creative Production' }],
    },
    {
      programId: 'program-a',
      programName: 'Alpha Program',
      campaignId: 'campaign-2',
      campaignName: 'Beta Campaign',
      spaces: [
        { id: 'space-z', title: 'Zulu Space' },
        { id: 'space-a', title: 'Alpha Space' },
      ],
    },
  ],
  onSelect: vi.fn(),
  onSelectCampaign: vi.fn(),
  onCreateSpace: vi.fn(),
}

describe('ChatInputPlusMenuSpacePanel', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('searches campaigns and spaces and selects either level', () => {
    const onCloseMenu = vi.fn()
    render(<ChatInputPlusMenuSpacePanel spacePicker={spacePicker} onCloseMenu={onCloseMenu} />)

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'creative' } })
    fireEvent.click(screen.getByRole('button', { name: 'Creative Production' }))
    expect(spacePicker.onSelect).toHaveBeenCalledWith('space-1')

    fireEvent.click(screen.getByText('Client Launch').closest('button')!)
    expect(spacePicker.onSelectCampaign).toHaveBeenCalledWith('campaign-1')
  })

  it('renders the Program to Campaign to Space hierarchy alphabetically', () => {
    render(<ChatInputPlusMenuSpacePanel spacePicker={spacePicker} onCloseMenu={vi.fn()} />)

    const programButtons = screen.getAllByRole('button', { name: /Program/ })
    expect(programButtons[0]?.textContent).toContain('Alpha Program')
    fireEvent.click(programButtons[0]!)
    fireEvent.click(screen.getByRole('button', { name: /Expand Beta Campaign/ }))
    const spaceButtons = screen.getAllByRole('button', { name: /Space/ })
    expect(spaceButtons.map((button) => button.textContent)).toEqual(
      expect.arrayContaining(['Alpha Space', 'Zulu Space']),
    )
    expect(spaceButtons.findIndex((button) => button.textContent === 'Alpha Space')).toBeLessThan(
      spaceButtons.findIndex((button) => button.textContent === 'Zulu Space'),
    )
  })

  it('offers new-space creation in the selected campaign', () => {
    render(<ChatInputPlusMenuSpacePanel spacePicker={spacePicker} onCloseMenu={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'New space' }))
    expect(spacePicker.onCreateSpace).toHaveBeenCalledWith('campaign-1')
  })
})
