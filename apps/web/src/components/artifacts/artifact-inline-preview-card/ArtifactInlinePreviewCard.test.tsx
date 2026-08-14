import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ArtifactInlinePreviewCard } from './ArtifactInlinePreviewCard'

const { fetchDeliverablesForMissions, fetchMissionById, openArtifactPreviewInShell } = vi.hoisted(
  () => ({
    fetchDeliverablesForMissions: vi.fn(),
    fetchMissionById: vi.fn(),
    openArtifactPreviewInShell: vi.fn(),
  }),
)

vi.mock('@/lib/missions', () => ({
  fetchDeliverablesForMissions,
  fetchMissionById,
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

  it('refreshes a Mission receipt to its terminal status and output count', async () => {
    fetchMissionById.mockResolvedValue({ id: 'mission-1', status: 'done' })
    fetchDeliverablesForMissions.mockResolvedValue({
      'mission-1': [{ id: 'deliverable-1' }, { id: 'deliverable-2' }],
    })

    render(
      <ArtifactInlinePreviewCard
        artifactType="mission"
        artifactId="mission-1"
        name="Client Strategy"
        subtitle="Started from this chat"
        status="Started"
      />,
    )

    expect(await screen.findByText('done · 2 outputs')).not.toBeNull()
  })
})
