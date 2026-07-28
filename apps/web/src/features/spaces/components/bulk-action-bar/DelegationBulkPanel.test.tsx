import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DelegationBulkPanel } from './DelegationBulkPanel'

vi.mock('./FloatingPanel', () => ({
  FloatingPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('DelegationBulkPanel', () => {
  it('offers filtered and urgent delegation without implying raw tasks are assigned', () => {
    const onDelegate = vi.fn()

    render(
      <DelegationBulkPanel
        anchorRef={{ current: null }}
        selectedCount={5}
        busy={false}
        onDelegate={onDelegate}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('Delegate 5 selected tasks')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Batch/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Review first/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Urgent/i }))
    fireEvent.change(screen.getByLabelText('Delegation note'), {
      target: { value: 'Ship the website replacement today.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send to Delegation Desk' }))

    expect(onDelegate).toHaveBeenCalledWith('urgent', 'Ship the website replacement today.')
  })
})
