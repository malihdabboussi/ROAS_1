import { describe, expect, it } from 'vitest'
import { teamDmArtifactPreviewSelectionFromDetail } from './team-dm-artifact-preview'

describe('teamDmArtifactPreviewSelectionFromDetail', () => {
  it('maps supported inline artifact detail types into space preview selections', () => {
    expect(
      teamDmArtifactPreviewSelectionFromDetail({
        artifactType: 'offer',
        artifactId: 'offer-1',
        name: 'Offer',
      }),
    ).toEqual({ type: 'offer', id: 'offer-1', title: 'Offer' })
    expect(
      teamDmArtifactPreviewSelectionFromDetail({
        artifactType: 'ad-campaign',
        artifactId: 'ad-campaign-1',
      }),
    ).toEqual({ type: 'ad_campaign', id: 'ad-campaign-1', title: 'Artifact' })
    expect(
      teamDmArtifactPreviewSelectionFromDetail({
        artifactType: 'social-post',
        artifactId: 'post-1',
        name: 'Post',
      }),
    ).toEqual({ type: 'social_post', id: 'post-1', title: 'Post' })
    expect(
      teamDmArtifactPreviewSelectionFromDetail({
        artifactType: 'blog-post',
        artifactId: 'blog-1',
        name: 'Blog',
      }),
    ).toEqual({ type: 'website', id: 'blog-1', title: 'Blog' })
    expect(
      teamDmArtifactPreviewSelectionFromDetail({
        artifactType: 'visual-doc',
        artifactId: 'doc-1',
        name: 'Doc',
      }),
    ).toEqual({ type: 'doc', id: 'doc-1', title: 'Doc' })
  })

  it('returns null without a supported artifact type and id', () => {
    expect(teamDmArtifactPreviewSelectionFromDetail({ artifactType: 'unknown', artifactId: 'x' })).toBe(
      null,
    )
    expect(teamDmArtifactPreviewSelectionFromDetail({ artifactType: 'offer' })).toBe(null)
    expect(teamDmArtifactPreviewSelectionFromDetail({ artifactId: 'offer-1' })).toBe(null)
  })
})
