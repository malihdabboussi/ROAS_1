import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { EmailArtifact } from '@/lib/artifacts/artifact-types'
import type { ArtifactListRow } from './artifact-display'
import { ArtifactCardBody } from './ArtifactCardBody'

afterEach(() => {
  cleanup()
})

const baseRow: ArtifactListRow = {
  id: 'artifact-1',
  title: 'Artifact title',
  subtitle: 'Artifact subtitle',
  description: 'Artifact description',
  thumbnailUrl: '/artifact-thumb.png',
  created_at: '2026-06-22T10:00:00.000Z',
  updated_at: '2026-06-22T11:00:00.000Z',
  badges: [{ label: 'Ready', tone: 'green' }],
  raw: {},
}

describe('ArtifactCardBody', () => {
  it('renders generic artifact thumbnails, badges, and descriptions', () => {
    const { container } = render(<ArtifactCardBody row={baseRow} previewType="doc" />)

    expect(container.querySelector('img')?.getAttribute('src')).toBe('/artifact-thumb.png')
    expect(screen.getByText('Ready')).toBeTruthy()
    expect(screen.getByText('Artifact title')).toBeTruthy()
    expect(screen.getByText('Artifact subtitle')).toBeTruthy()
    expect(screen.getByText('Artifact description')).toBeTruthy()
  })

  it('renders email previews with the shared preview pane height', () => {
    const emailRaw: EmailArtifact = {
      id: 'email-1',
      subject: 'Launch email',
      body: '<p>Hello <strong>world</strong></p>',
      status: 'draft',
      campaign_id: 'campaign-1',
      space_id: 'space-1',
      source_item_id: null,
      user_id: 'user-1',
      created_by: 'user-1',
      created_at: '2026-06-22T10:00:00.000Z',
      updated_at: '2026-06-22T11:00:00.000Z',
    }

    const { container } = render(
      <ArtifactCardBody row={{ ...baseRow, raw: emailRaw }} previewType="email" emailRaw={emailRaw} />,
    )

    expect(screen.getByText('Hello world')).toBeTruthy()
    expect(screen.getByText('Launch email')).toBeTruthy()
    expect(container.querySelector('[style*="height: 250px"]')).toBeTruthy()
  })
})
