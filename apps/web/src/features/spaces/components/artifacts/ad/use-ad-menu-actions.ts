'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import { buildNewViewDef } from '@/features/spaces/components/ViewSwitcher'
import { updateSpace } from '@/features/spaces/services/spaces.service'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import type { ViewDef } from '@/features/spaces/types/space-schema'
import { fetchAdSet } from '@/lib/artifacts/artifact-preview-api'
import {
  useAdMenuActions as useSharedAdMenuActions,
  type AdMenuActions,
  type AdMenuTarget,
} from '@/lib/artifacts/use-ad-menu-actions'
import { SPACES_ARTIFACT_TOAST_ERRORS } from '../../../config/spaces-toast-errors.config'

export type { AdMenuTarget } from '@/lib/artifacts/use-ad-menu-actions'

interface UseAdMenuActionsArgs {
  ad: AdMenuTarget
  onChanged?: () => void
}

export interface SpacesAdMenuActions extends AdMenuActions {
  viewAnalytics(): Promise<void>
}

export function useAdMenuActions({ ad, onChanged }: UseAdMenuActionsArgs): SpacesAdMenuActions {
  const sharedActions = useSharedAdMenuActions({
    ad,
    onChanged,
  })

  const viewAnalytics = useCallback(async () => {
    const state = useSpacesStore.getState()
    const space = state.spaces.find((s) => s.id === state.activeSpaceId)
    if (!space) return
    const schema = space.schema
    if (!schema) return

    let adCampaignRowId: string | undefined
    if (ad.ad_set_id) {
      try {
        const set = await fetchAdSet(ad.ad_set_id)
        if (set.ad_campaign_id) adCampaignRowId = set.ad_campaign_id
      } catch (err) {
        console.error('Resolve ad campaign for analytics failed:', err)
      }
    }

    const existing = (schema.views as ViewDef[] | undefined)?.find(
      (v) => v.type === 'ads_performance',
    )
    if (existing) {
      state.setActiveView(existing.id)
      return
    }
    try {
      const baseView = buildNewViewDef({
        type: 'ads_performance',
        label: 'Ads',
        icon: 'megaphone',
        description: 'Meta spend, ROAS, and campaign drill-down',
        newViewId: `ads_performance_${ad.id.slice(0, 6)}`,
      })
      const newView: ViewDef = {
        ...baseView,
        reporting_config: {
          ...(baseView.reporting_config ?? {}),
          ...(adCampaignRowId ? { ad_campaign_ids: [adCampaignRowId] } : {}),
        },
      }
      const nextSchema = { ...schema, views: [...(schema.views ?? []), newView] }
      state.patchActiveSpaceSchema(nextSchema)
      await updateSpace(space.id, { schema: nextSchema })
      state.setActiveView(newView.id)
    } catch (err) {
      console.error('Create ads analytics view failed:', err)
      toast.error(SPACES_ARTIFACT_TOAST_ERRORS.OPEN_ANALYTICS_FAILED.userMessage)
    }
  }, [ad.id, ad.ad_set_id])

  return {
    ...sharedActions,
    viewAnalytics,
  }
}
