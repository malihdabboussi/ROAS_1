import { describe, expect, it } from 'vitest'
import { ARTIFACT_VIEW_TYPES, buildArtifactViewDef } from './build-artifact-view-def'

describe('buildArtifactViewDef', () => {
  it('creates all artifact view definitions with nested config defaults', () => {
    for (const viewType of ARTIFACT_VIEW_TYPES) {
      const view = buildArtifactViewDef(viewType, { pinnedToStart: true })
      expect(view.id).toBe(viewType)
      expect(view.type).toBe(viewType)
      expect(view.pinned_to_start).toBe(true)
      const configKey = `${viewType}_config`.replace('ad_campaigns_config', 'ad_campaigns_config')
      expect(view as Record<string, unknown>).toHaveProperty(configKey)
    }
  })
})
