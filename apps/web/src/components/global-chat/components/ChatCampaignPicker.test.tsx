import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChatCampaignPicker } from './ChatCampaignPicker'

const OPTIONS = [
  { id: 'space-impact', label: 'Impact Elite' },
  { id: 'space-acme', label: 'Acme Launch' },
]

describe('ChatCampaignPicker', () => {
  it('searches campaigns and returns a clearly selected option', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <ChatCampaignPicker options={OPTIONS} value="" onChange={onChange} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Select client campaign' }))
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search client campaigns' }), {
      target: { value: 'impact' },
    })

    expect(screen.getByRole('option', { name: 'Impact Elite' })).toBeTruthy()
    expect(screen.queryByRole('option', { name: 'Acme Launch' })).toBeNull()
    fireEvent.click(screen.getByRole('option', { name: 'Impact Elite' }))
    expect(onChange).toHaveBeenCalledWith('space-impact')

    rerender(<ChatCampaignPicker options={OPTIONS} value="space-impact" onChange={onChange} />)
    expect(screen.getByRole('button', { name: 'Select client campaign' })).toHaveTextContent(
      'Impact Elite',
    )
  })
})
