import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchGlobalArtifacts } from '@/lib/artifacts/global-artifacts-api'
import { openArtifactInShell } from '@/lib/artifacts/shell-artifact-viewer'
import { GlobalArtifactsPage } from './GlobalArtifactsPage'

vi.mock('@/lib/artifacts/global-artifacts-api', () => ({
  fetchGlobalArtifacts: vi.fn(),
}))

vi.mock('@/lib/artifacts/shell-artifact-viewer', () => ({
  openArtifactInShell: vi.fn(),
}))

const documentItem = {
  id: 'doc-1',
  title: 'Webinar registration copy',
  badge: 'Doc',
  category: 'docs' as const,
  contextLabel: 'Q3 Launch',
  sourceKind: 'created' as const,
  updatedAt: '2026-07-17T20:00:00.000Z',
  viewer: { id: 'doc-1', title: 'Webinar registration copy', type: 'doc' as const },
}

const imageItem = {
  id: 'image-1',
  title: 'Clock concept',
  badge: 'Image',
  category: 'images' as const,
  contextLabel: 'Creative Space',
  updatedAt: '2026-07-16T20:00:00.000Z',
  sourceKind: 'generated' as const,
  thumbnailUrl: 'https://example.com/clock.png',
  viewer: { id: 'image-1', title: 'Clock concept', type: 'image' as const },
}

const uploadedImageItem = {
  ...imageItem,
  id: 'image-2',
  title: 'Uploaded screenshot',
  sourceKind: 'uploaded' as const,
  thumbnailUrl: 'https://example.com/screenshot.png',
  viewer: { id: 'image-2', title: 'Uploaded screenshot', type: 'image' as const },
}

const presentationItem = {
  id: 'presentation-1',
  title: 'Account sales deck',
  badge: 'Presentation',
  category: 'presentations' as const,
  contextLabel: 'Q3 Launch',
  updatedAt: '2026-07-15T20:00:00.000Z',
  sourceKind: 'created' as const,
  viewer: { id: 'presentation-1', title: 'Account sales deck', type: 'presentation' as const },
}

const videoItem = {
  id: 'video-1',
  title: 'Launch teaser',
  badge: 'Video',
  category: 'videos' as const,
  contextLabel: 'Creative Space',
  updatedAt: '2026-07-18T20:00:00.000Z',
  sourceKind: 'generated' as const,
  viewer: {
    id: 'video-1',
    title: 'Launch teaser',
    type: 'video' as const,
    fileUrl: 'https://example.com/launch-teaser.mp4',
    mimeType: 'video/mp4',
  },
}

describe('GlobalArtifactsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchGlobalArtifacts).mockResolvedValue([
      documentItem,
      imageItem,
      uploadedImageItem,
      presentationItem,
      videoItem,
    ])
  })

  afterEach(() => {
    cleanup()
  })

  it('lists account-wide artifacts, filters them, and opens the shared viewer', async () => {
    render(<GlobalArtifactsPage />)

    expect(await screen.findByText('Webinar registration copy')).toBeInTheDocument()
    expect(screen.getByText('Clock concept')).toBeInTheDocument()
    expect(screen.getByText('Account sales deck')).toBeInTheDocument()
    expect(screen.getByText('Launch teaser')).toBeInTheDocument()
    expect(screen.queryByText('Uploaded screenshot')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Clock concept preview' })).toHaveAttribute(
      'src',
      'https://example.com/clock.png',
    )
    expect(fetchGlobalArtifacts).toHaveBeenCalledWith('', expect.any(AbortSignal))

    fireEvent.click(screen.getByRole('button', { name: 'Images' }))
    expect(screen.queryByText('Webinar registration copy')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Source filters' }))
    fireEvent.click(screen.getByRole('button', { name: /^Uploaded/ }))
    expect(screen.queryByText('Clock concept')).not.toBeInTheDocument()
    expect(screen.getByText('Uploaded screenshot')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Source filters' }))
    fireEvent.click(screen.getByRole('button', { name: /^Created/ }))
    expect(screen.getByText('Clock concept')).toBeInTheDocument()
    expect(screen.queryByText('Uploaded screenshot')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Clock concept'))

    expect(openArtifactInShell).toHaveBeenCalledWith(imageItem.viewer)
  })

  it('filters videos and renders their first-frame preview', async () => {
    render(<GlobalArtifactsPage />)

    await screen.findByText('Launch teaser')
    fireEvent.click(screen.getByRole('button', { name: 'Videos' }))

    expect(screen.getByText('Launch teaser')).toBeInTheDocument()
    expect(screen.queryByText('Clock concept')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Launch teaser preview')).toHaveAttribute(
      'src',
      'https://example.com/launch-teaser.mp4',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Card view' }))
    expect(screen.getByLabelText('Launch teaser preview')).toHaveAttribute(
      'src',
      'https://example.com/launch-teaser.mp4',
    )
  })

  it('switches between list and card views without wrapping the search field twice', async () => {
    render(<GlobalArtifactsPage />)

    await screen.findByText('Webinar registration copy')
    const search = screen.getByPlaceholderText('Search all artifacts…')
    expect(search.parentElement?.className).not.toContain('input-glass')
    expect(search.className).toContain('input-leading')
    expect(search.className).not.toContain('px-spacing-3')

    expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Card view' }))
    expect(screen.getByRole('button', { name: 'Card view' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByTestId('artifact-card-grid')).toBeInTheDocument()
  })

  it('embeds in the shell viewer without the page heading', async () => {
    render(<GlobalArtifactsPage embedded />)

    expect(await screen.findByText('Webinar registration copy')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'ALL ARTIFACTS' })).toBeNull()
  })

  it('reloads the global results when the search changes', async () => {
    render(<GlobalArtifactsPage />)

    fireEvent.change(screen.getByPlaceholderText('Search all artifacts…'), {
      target: { value: 'clock' },
    })

    await waitFor(() => {
      expect(fetchGlobalArtifacts).toHaveBeenLastCalledWith('clock', expect.any(AbortSignal))
    })
  })
})
