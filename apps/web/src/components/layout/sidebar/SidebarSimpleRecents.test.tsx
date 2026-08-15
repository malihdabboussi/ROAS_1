import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SidebarSimpleRecents } from './SidebarSimpleRecents'

vi.mock('@/components/shell/ShellChatMenu', () => ({
  ShellChatMenu: ({
    navigationSlot,
    simpleSidebar,
  }: {
    navigationSlot?: ReactNode
    simpleSidebar?: boolean
  }) => (
    <div>
      {navigationSlot}
      <span data-testid="simple-sidebar">{String(simpleSidebar)}</span>
      <span>Conversation rows</span>
    </div>
  ),
}))

describe('SidebarSimpleRecents', () => {
  it('keeps Recents mounted so Pinned can sit above the conversation list', () => {
    render(<SidebarSimpleRecents navigation={<span>Navigation</span>} />)

    expect(screen.getByText('Navigation')).toBeInTheDocument()
    expect(screen.getByTestId('simple-sidebar')).toHaveTextContent('true')
    expect(screen.getByText('Conversation rows')).toBeInTheDocument()
  })
})
