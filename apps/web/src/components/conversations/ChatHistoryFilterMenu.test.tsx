import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CHAT_HISTORY_FILTERS, type ChatHistoryFilterState } from '@/lib/conversations'
import { ChatHistoryFilterMenu } from './ChatHistoryFilterMenu'

describe('ChatHistoryFilterMenu', () => {
  afterEach(cleanup)

  it('portals the filter menu outside its sidebar stacking context', () => {
    const onChange = vi.fn()
    const { container } = render(
      <div data-testid="sidebar">
        <ChatHistoryFilterMenu
          value={{ ...DEFAULT_CHAT_HISTORY_FILTERS } as ChatHistoryFilterState}
          onChange={onChange}
        />
      </div>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Filter conversations' }))

    const menu = screen.getByRole('menu')
    expect(document.body).toContainElement(menu)
    expect(container).not.toContainElement(menu)
    expect(menu).toHaveAttribute('data-dropdown')
    expect(screen.getByText('Type')).toBeInTheDocument()
  })

  it('closes the portaled menu when clicking outside it', () => {
    render(
      <ChatHistoryFilterMenu
        value={{ ...DEFAULT_CHAT_HISTORY_FILTERS } as ChatHistoryFilterState}
        onChange={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Filter conversations' }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('changes and resets the independently selected agent scope', () => {
    const onAgentKeyChange = vi.fn()
    render(
      <ChatHistoryFilterMenu
        value={{ ...DEFAULT_CHAT_HISTORY_FILTERS }}
        onChange={vi.fn()}
        agentKey="reed"
        agentOptions={[
          { key: 'reed', label: 'Reed' },
          { key: 'lux', label: 'Lux' },
        ]}
        onAgentKeyChange={onAgentKeyChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Filter conversations' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Agent Reed' }))
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'All agents' }))
    expect(onAgentKeyChange).toHaveBeenCalledWith(null)

    fireEvent.click(screen.getByRole('menuitem', { name: 'Reset to defaults' }))
    expect(onAgentKeyChange).toHaveBeenLastCalledWith(null)
  })
})
