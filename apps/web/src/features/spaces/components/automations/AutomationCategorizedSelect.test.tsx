import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { AutomationCategorizedSelect } from './AutomationCategorizedSelect'

describe('AutomationCategorizedSelect', () => {
  it('keeps a portaled menu inside its supplied dialog owner', () => {
    const owner = document.createElement('div')
    document.body.appendChild(owner)
    const onChange = vi.fn()

    function Harness() {
      const [value, setValue] = useState('space-1')
      return (
        <AutomationCategorizedSelect
          sections={[
            {
              heading: 'Claude Club',
              options: [
                { value: 'space-1', label: 'General' },
                { value: 'space-2', label: 'AI Webinar With Samin' },
              ],
            },
          ]}
          value={value}
          onChange={(nextValue, option) => {
            setValue(nextValue)
            onChange(nextValue, option)
          }}
          placeholder="Select a campaign and space…"
          portalContainer={owner}
        />
      )
    }

    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'General' }))

    const option = screen.getByRole('button', { name: 'AI Webinar With Samin' })
    expect(owner).toContainElement(option)
    fireEvent.click(option)

    expect(onChange).toHaveBeenCalledWith(
      'space-2',
      expect.objectContaining({ label: 'AI Webinar With Samin' }),
    )
    expect(screen.getByRole('button', { name: 'AI Webinar With Samin' })).toBeInTheDocument()

    owner.remove()
  })
})
