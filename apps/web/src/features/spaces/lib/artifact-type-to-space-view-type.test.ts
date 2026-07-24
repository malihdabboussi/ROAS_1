import { describe, expect, it } from 'vitest'
import { artifactTypeToSpaceViewType } from './artifact-type-to-space-view-type'

describe('artifactTypeToSpaceViewType', () => {
  it('routes generated funnels and websites to their distinct Space views', () => {
    expect(artifactTypeToSpaceViewType('funnel')).toBe('funnels')
    expect(artifactTypeToSpaceViewType('website')).toBe('websites')
  })
})
