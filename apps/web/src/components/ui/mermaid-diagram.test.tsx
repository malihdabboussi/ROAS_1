import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MERMAID_DIAGRAM_MESSAGES, MermaidDiagram } from './mermaid-diagram'

describe('MermaidDiagram', () => {
  it('does not show a fake rendering state while the fence is still open', () => {
    render(<MermaidDiagram code="flowchart TD" pending />)

    expect(screen.getByText(MERMAID_DIAGRAM_MESSAGES.pending)).toBeInTheDocument()
    expect(screen.queryByText(MERMAID_DIAGRAM_MESSAGES.rendering)).toBeNull()
  })
})
