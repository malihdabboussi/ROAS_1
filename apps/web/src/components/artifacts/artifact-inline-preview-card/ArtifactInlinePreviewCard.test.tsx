import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ArtifactInlinePreviewCard } from './ArtifactInlinePreviewCard'

const { openArtifactPreviewInShell } = vi.hoisted(() => ({
  openArtifactPreviewInShell: vi.fn(),
}))

vi.mock('@/lib/artifacts', () => ({
  openArtifactPreviewInShell,
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

    expect(openArtifactPreviewInShell).toHaveBeenCalledWith({
      artifactType: 'task',
      artifactId: 'task-1',
      name: 'Prepare the client follow-up',
      spaceId: 'delegation-desk-1',
    })
  })
})
