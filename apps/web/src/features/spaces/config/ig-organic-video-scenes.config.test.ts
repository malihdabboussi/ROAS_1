import { describe, expect, it } from 'vitest'
import {
  filterIgOrganicScenes,
  IG_ORGANIC_INDUSTRY_PACKS,
  IG_ORGANIC_VIDEO_SCENES,
} from './ig-organic-video-scenes.config'

describe('ig-organic-video-scenes', () => {
  it('keeps lifestyle presets and six industry packs with three preset scenes each', () => {
    const lifestyle = filterIgOrganicScenes({ fit: 'lifestyle' })
    const industry = filterIgOrganicScenes({ fit: 'industry_adjacent' })

    expect(lifestyle.length).toBe(17)
    expect(lifestyle.every((scene) => scene.fit === 'lifestyle')).toBe(true)
    expect(IG_ORGANIC_INDUSTRY_PACKS.map((pack) => pack.id)).toEqual([
      'trades-home-services',
      'health-fitness',
      'professional-services',
      'real-estate-mortgage',
      'coaching',
      'social-media-influencer',
    ])
    expect(industry).toHaveLength(18)
    expect(industry.every((scene) => Boolean(scene.presetVideoUrl && scene.presetStillUrl))).toBe(
      true,
    )
    for (const pack of IG_ORGANIC_INDUSTRY_PACKS) {
      expect(
        filterIgOrganicScenes({ fit: 'industry_adjacent', industryPack: pack.id }),
      ).toHaveLength(3)
    }
  })

  it('keeps every scene id unique', () => {
    const ids = IG_ORGANIC_VIDEO_SCENES.map((scene) => scene.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
