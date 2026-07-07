import { Profiler } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BrainMemory } from '../types'
import { KnowledgeSourcePreview } from './KnowledgeSourcePreview'

function knowledgeNode(overrides: Partial<BrainMemory> = {}): BrainMemory {
  return {
    id: 'node-1',
    content: 'Welcome body',
    memory_type: 'sequence_email',
    source_type: 'sequence_email',
    source_id: 'email-1',
    parent_id: 'sequence-1',
    source_title: 'Welcome email',
    significance: 0.8,
    confidence: 1,
    tags: [],
    recalled_count: 0,
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
    node_type: 'knowledge_source',
    knowledge_scope: 'space',
    knowledge_source_type: 'sequence_email',
    space_id: 'space-1',
    metadata: {
      subject: 'Welcome email',
      body: 'Thanks for joining the launch list.',
    },
    ...overrides,
  }
}

describe('KnowledgeSourcePreview', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('opens explicit source links in a new tab without dispatching artifact events', () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true })))
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    const eventSpy = vi.fn()
    window.addEventListener('vibey-open-artifact', eventSpy)

    render(<KnowledgeSourcePreview node={knowledgeNode()} sourceHref="/spaces/space-1/doc-1" />)

    expect(screen.getByText('Thanks for joining the launch list.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Welcome email/i }))

    expect(openSpy).toHaveBeenCalledWith('/spaces/space-1/doc-1', '_blank', 'noopener,noreferrer')
    expect(eventSpy).not.toHaveBeenCalled()

    window.removeEventListener('vibey-open-artifact', eventSpy)
  })

  it('dispatches artifact open events when no explicit source link exists', () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true })))
    const eventSpy = vi.fn()
    window.addEventListener('vibey-open-artifact', eventSpy)

    render(<KnowledgeSourcePreview node={knowledgeNode()} />)

    fireEvent.click(screen.getByRole('button', { name: /Welcome email/i }))

    expect(eventSpy).toHaveBeenCalledTimes(1)
    expect((eventSpy.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
      artifactType: 'sequence',
      artifactId: 'sequence-1',
      name: 'Welcome email',
      spaceId: 'space-1',
    })

    window.removeEventListener('vibey-open-artifact', eventSpy)
  })

  it('settles without repeated render churn across equivalent node updates', () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true })))
    const onRender = vi.fn()
    const node = knowledgeNode()
    const { rerender } = render(
      <Profiler id="knowledge-source-preview" onRender={onRender}>
        <KnowledgeSourcePreview node={node} />
      </Profiler>,
    )

    rerender(
      <Profiler id="knowledge-source-preview" onRender={onRender}>
        <KnowledgeSourcePreview node={knowledgeNode()} />
      </Profiler>,
    )

    expect(screen.getByText('Thanks for joining the launch list.')).toBeTruthy()
    expect(onRender).toHaveBeenCalledTimes(2)
  })
})
