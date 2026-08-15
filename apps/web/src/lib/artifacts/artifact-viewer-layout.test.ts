import { describe, expect, it } from 'vitest'
import {
  ARTIFACT_VIEWER_WIDTH_DEFAULT,
  ARTIFACT_VIEWER_WIDTH_MIN,
  clampArtifactViewerWidth,
  preferredArtifactViewerWidth,
  resolveOpenedArtifactViewerWidth,
  resolvePersistedArtifactViewerWidth,
} from './artifact-viewer-layout'

describe('artifact viewer layout', () => {
  it('sizes document-class editors wider than media', () => {
    expect(preferredArtifactViewerWidth('doc')).toBe(960)
    expect(preferredArtifactViewerWidth('presentation')).toBe(960)
    expect(preferredArtifactViewerWidth('funnel')).toBe(960)
    expect(preferredArtifactViewerWidth('image')).toBe(720)
  })

  it('enforces a minimum width and does not impose a maximum', () => {
    expect(clampArtifactViewerWidth(100)).toBe(ARTIFACT_VIEWER_WIDTH_MIN)
    expect(clampArtifactViewerWidth(1400)).toBe(1400)
    expect(clampArtifactViewerWidth(2000)).toBe(2000)
  })

  it('can grow until it fills the parent row', () => {
    expect(clampArtifactViewerWidth(1400, 1000)).toBe(1000)
    expect(clampArtifactViewerWidth(100, 1000)).toBe(ARTIFACT_VIEWER_WIDTH_MIN)
  })

  it('promotes the legacy 480 default to the editor-sized default', () => {
    expect(resolvePersistedArtifactViewerWidth(undefined)).toBe(ARTIFACT_VIEWER_WIDTH_DEFAULT)
    expect(resolvePersistedArtifactViewerWidth(480)).toBe(ARTIFACT_VIEWER_WIDTH_DEFAULT)
    expect(resolvePersistedArtifactViewerWidth(1100)).toBe(1100)
  })

  it('opens a document at least as wide as the preferred editor size', () => {
    expect(resolveOpenedArtifactViewerWidth(480, 'doc')).toBe(960)
    expect(resolveOpenedArtifactViewerWidth(1200, 'doc')).toBe(1200)
  })
})
