import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import type { AdSet } from '../../types'
import type { AdSetPlacementOption } from './AdSetPlacementsField'
import type { AdSetSettingsSaveField } from './useAdSetSettingsFieldSaves'

const INSTAGRAM_POSITION_NAMES: Record<string, string> = {
  feed: 'stream',
  story: 'story',
  reels: 'reels',
}

interface UseAdSetSettingsPlacementsParams {
  targeting: Record<string, unknown>
  setData: Dispatch<SetStateAction<AdSet | null>>
  saveField: AdSetSettingsSaveField
}

export function useAdSetSettingsPlacements({
  targeting,
  setData,
  saveField,
}: UseAdSetSettingsPlacementsParams) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const activePlacementKeys = useMemo(() => {
    const fb = (targeting.facebook_positions ?? []) as string[]
    const ig = (targeting.instagram_positions ?? []) as string[]
    const pp = (targeting.publisher_platforms ?? []) as string[]
    const keys = new Set<string>()
    fb.forEach((placement) => keys.add(`facebook:${placement}`))
    ig.forEach((placement) => keys.add(`instagram:${placement}`))
    if (pp.includes('audience_network')) keys.add('audience_network:audience_network')
    return keys
  }, [targeting])

  const isPlacementActive = useCallback(
    (value: string, platform: string) => {
      if (platform === 'audience_network')
        return activePlacementKeys.has('audience_network:audience_network')
      if (platform === 'instagram') {
        const igKey = INSTAGRAM_POSITION_NAMES[value] ?? value
        return activePlacementKeys.has(`instagram:${igKey}`)
      }
      return activePlacementKeys.has(`facebook:${value}`)
    },
    [activePlacementKeys],
  )

  const saveTargetingPlacements = useCallback(
    (newTargeting: Record<string, unknown>) => {
      setData((prev) => (prev ? { ...prev, targeting: newTargeting } : prev))
      void saveField('targeting', newTargeting, 'targeting_placements')
    },
    [saveField, setData],
  )

  const handleTogglePlacement = useCallback(
    (value: string, platform: string) => {
      const facebookPositions = new Set((targeting.facebook_positions ?? []) as string[])
      const instagramPositions = new Set((targeting.instagram_positions ?? []) as string[])
      const publisherPlatforms = new Set(
        (targeting.publisher_platforms ?? ['facebook', 'instagram']) as string[],
      )

      if (platform === 'audience_network') {
        if (publisherPlatforms.has('audience_network')) publisherPlatforms.delete('audience_network')
        else publisherPlatforms.add('audience_network')
      } else if (platform === 'facebook') {
        if (facebookPositions.has(value)) facebookPositions.delete(value)
        else {
          facebookPositions.add(value)
          publisherPlatforms.add('facebook')
        }
      } else if (platform === 'instagram') {
        const igKey = INSTAGRAM_POSITION_NAMES[value] ?? value
        if (instagramPositions.has(igKey)) instagramPositions.delete(igKey)
        else {
          instagramPositions.add(igKey)
          publisherPlatforms.add('instagram')
        }
      }

      saveTargetingPlacements({
        ...targeting,
        publisher_platforms: Array.from(publisherPlatforms),
        facebook_positions: Array.from(facebookPositions),
        instagram_positions: Array.from(instagramPositions),
      })
    },
    [saveTargetingPlacements, targeting],
  )

  const handleToggleGroup = useCallback(
    (placements: AdSetPlacementOption[]) => {
      const allActive = placements.every((placement) =>
        isPlacementActive(placement.value, placement.platform),
      )
      const facebookPositions = new Set((targeting.facebook_positions ?? []) as string[])
      const instagramPositions = new Set((targeting.instagram_positions ?? []) as string[])
      const publisherPlatforms = new Set(
        (targeting.publisher_platforms ?? ['facebook', 'instagram']) as string[],
      )

      for (const placement of placements) {
        if (placement.platform === 'audience_network') {
          if (allActive) publisherPlatforms.delete('audience_network')
          else publisherPlatforms.add('audience_network')
        } else if (placement.platform === 'facebook') {
          if (allActive) facebookPositions.delete(placement.value)
          else {
            facebookPositions.add(placement.value)
            publisherPlatforms.add('facebook')
          }
        } else if (placement.platform === 'instagram') {
          const igKey = INSTAGRAM_POSITION_NAMES[placement.value] ?? placement.value
          if (allActive) instagramPositions.delete(igKey)
          else {
            instagramPositions.add(igKey)
            publisherPlatforms.add('instagram')
          }
        }
      }

      saveTargetingPlacements({
        ...targeting,
        publisher_platforms: Array.from(publisherPlatforms),
        facebook_positions: Array.from(facebookPositions),
        instagram_positions: Array.from(instagramPositions),
      })
    },
    [isPlacementActive, saveTargetingPlacements, targeting],
  )

  const handleManualPlacementsChange = useCallback(
    (manualPlacements: boolean) => {
      saveTargetingPlacements({ ...targeting, manual_placements: manualPlacements })
    },
    [saveTargetingPlacements, targeting],
  )

  return {
    expandedGroups,
    setExpandedGroups,
    isPlacementActive,
    handleManualPlacementsChange,
    handleToggleGroup,
    handleTogglePlacement,
  }
}
