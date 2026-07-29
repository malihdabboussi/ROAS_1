import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ArtifactInlinePreviewCard } from './ArtifactInlinePreviewCard'

const { openArtifactInShell } = vi.hoisted(() => ({
  openArtifactInShell: vi.fn(),
}))

vi.mock('@/lib/artifacts', () => ({
  openArtifactInShell,
}))

describe('ArtifactInlinePreviewCard', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('opens a created task in the shell task panel without changing routes', () => {
    render(
      <ArtifactInlinePreviewCard
        artifactType="task"
        artifactId="task-1"
        name="Prepare the client follow-up"
        spaceId="delegation-desk-1"
      />,
    )

    fireEvent.click(screen.getByText('Prepare the client follow-up'))

    expect(openArtifactInShell).toHaveBeenCalledWith({
      id: 'task-1',
      entityId: 'task-1',
      entityTable: 'space_items',
      spaceId: 'delegation-desk-1',
      title: 'Prepare the client follow-up',
      type: 'task',
    })
  })
})
