'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import { buildNewViewDef } from '@/features/spaces/components/ViewSwitcher'
import { updateSpace } from '@/features/spaces/services/spaces.service'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import type { ViewDef } from '@/features/spaces/types/space-schema'
import {
  useFunnelMenuActions as useSharedFunnelMenuActions,
  type FunnelMenuActions,
  type FunnelMenuTarget,
} from '@/lib/artifacts/use-funnel-menu-actions'
import { SPACES_ARTIFACT_TOAST_ERRORS } from '../../../config/spaces-toast-errors.config'

export type { FunnelMenuTarget }

interface UseFunnelMenuActionsArgs {
  funnel: FunnelMenuTarget
  onChanged?: () => void
}

export interface SpacesFunnelMenuActions extends FunnelMenuActions {
  openSettings(): void
  viewAnalytics(): Promise<void>
}

export function useFunnelMenuActions({
  funnel,
  onChanged,
}: UseFunnelMenuActionsArgs): SpacesFunnelMenuActions {
  const sharedActions = useSharedFunnelMenuActions({ funnel, onChanged })

  const openSettings = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent('navigate-settings-section', {
        detail: { section: 'funnel' as const, funnelId: funnel.id },
      }),
    )
  }, [funnel.id])

  const viewAnalytics = useCallback(async () => {
    const state = useSpacesStore.getState()
    const space = state.spaces.find((s) => s.id === state.activeSpaceId)
    if (!space) return
    const schema = space.schema
    if (!schema) return
    const existing = (schema.views as ViewDef[] | undefined)?.find(
      (v) => v.type === 'funnel_analytics',
    )
    if (existing) {
      state.setActiveView(existing.id)
      return
    }
    try {
      const baseView = buildNewViewDef({
        type: 'funnel_analytics',
        label: 'Funnel Analytics',
        icon: 'filter',
        description: 'Funnel performance — sessions, leads, conversion',
        newViewId: `funnel_analytics_${funnel.id.slice(0, 6)}`,
      })
      const newView: ViewDef = {
        ...baseView,
        reporting_config: {
          ...(baseView.reporting_config ?? {}),
          funnel_ids: [funnel.id],
        },
      }
      const nextSchema = { ...schema, views: [...(schema.views ?? []), newView] }
      state.patchActiveSpaceSchema(nextSchema)
      await updateSpace(space.id, { schema: nextSchema })
      state.setActiveView(newView.id)
    } catch (err) {
      console.error('Create funnel analytics view failed:', err)
      toast.error(SPACES_ARTIFACT_TOAST_ERRORS.OPEN_ANALYTICS_FAILED.userMessage)
    }
  }, [funnel.id])

  return {
    ...sharedActions,
    openSettings,
    viewAnalytics,
  }
}
