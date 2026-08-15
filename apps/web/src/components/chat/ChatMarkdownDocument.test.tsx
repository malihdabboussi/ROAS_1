import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatMarkdownDocument } from './ChatMarkdownDocument'

vi.mock('@/components/ui/mermaid-diagram', () => ({
  MermaidDiagram: ({ code, pending }: { code: string; pending?: boolean }) => (
    <div data-testid="mermaid-diagram" data-pending={pending ? 'true' : 'false'}>
      {code}
    </div>
  ),
}))

describe('ChatMarkdownDocument', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders mermaid as a React diagram instead of a loading placeholder', () => {
    render(
      <ChatMarkdownDocument markdown={'```mermaid\nflowchart TD\n  A --> B\n```\nSee above.'} />,
    )

    expect(screen.getByTestId('mermaid-diagram')).toHaveTextContent('flowchart TD')
    expect(screen.getByTestId('mermaid-diagram')).toHaveAttribute('data-pending', 'false')
    expect(screen.queryByText('Rendering diagram…')).toBeNull()
    expect(screen.getByText(/See above/)).toBeInTheDocument()
  })

  it('keeps an open fence in a pending diagram instead of a stuck loading placeholder', () => {
    render(<ChatMarkdownDocument markdown={'```mermaid\nflowchart TD\n  A --> B'} />)

    expect(screen.getByTestId('mermaid-diagram')).toHaveAttribute('data-pending', 'true')
  })
})
