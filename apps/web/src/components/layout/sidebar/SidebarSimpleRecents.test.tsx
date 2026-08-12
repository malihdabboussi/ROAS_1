import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SidebarSimpleRecents } from './SidebarSimpleRecents'

vi.mock('@/components/shell/ShellChatMenu', () => ({
  ShellChatMenu: ({
    navigationSlot,
    compactHeaderEndSlot,
    compactHeaderTitleClassName,
  }: {
    navigationSlot?: ReactNode
    compactHeaderEndSlot?: ReactNode
    compactHeaderTitleClassName?: string
  }) => (
    <div>
      {navigationSlot}
      <span data-testid="recents-title" className={compactHeaderTitleClassName}>
        Recents
      </span>
      {compactHeaderEndSlot}
      <span>Conversation rows</span>
    </div>
  ),
}))

describe('SidebarSimpleRecents', () => {
  it('collapses and restores only the Recents conversation list', () => {
    render(<SidebarSimpleRecents navigation={<span>Navigation</span>} />)

    expect(screen.getByTestId('recents-title')).toHaveClass('text-tertiary')
    expect(screen.getByRole('button', { name: 'Collapse Recents' })).toHaveClass(
      'opacity-0',
      'group-hover:opacity-100',
      'group-focus-within:opacity-100',
    )
    expect(screen.getByRole('button', { name: 'Collapse Recents' })).not.toHaveClass(
      'btn-icon-bare',
      'hover:bg-hover-subtle',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Collapse Recents' }))
    expect(screen.queryByText('Conversation rows')).not.toBeInTheDocument()
    const collapsedTrigger = screen.getByRole('button', { name: 'Recents' })
    expect(collapsedTrigger).toHaveAttribute('aria-expanded', 'false')
    expect(collapsedTrigger.querySelector('svg')).not.toHaveClass('opacity-0')

    fireEvent.click(screen.getByRole('button', { name: 'Recents' }))
    expect(screen.getByText('Conversation rows')).toBeInTheDocument()
  })
})
