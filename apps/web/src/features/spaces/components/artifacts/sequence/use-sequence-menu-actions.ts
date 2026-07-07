'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import { buildNewViewDef } from '@/features/spaces/components/ViewSwitcher'
import { updateSpace } from '@/features/spaces/services/spaces.service'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import type { ViewDef } from '@/features/spaces/types/space-schema'
import {
  useSequenceMenuActions as useSharedSequenceMenuActions,
  type SequenceMenuActions,
  type SequenceMenuTarget,
} from '@/lib/artifacts/use-sequence-menu-actions'
import { SPACES_ARTIFACT_TOAST_ERRORS } from '../../../config/spaces-toast-errors.config'

export type { SequenceMenuTarget } from '@/lib/artifacts/use-sequence-menu-actions'

interface UseSequenceMenuActionsArgs {
  sequence: SequenceMenuTarget
  onChanged?: () => void
}

export interface SpacesSequenceMenuActions extends SequenceMenuActions {
  viewAnalytics(): Promise<void>
}

export function useSequenceMenuActions({
  sequence,
  onChanged,
}: UseSequenceMenuActionsArgs): SpacesSequenceMenuActions {
  const sharedActions = useSharedSequenceMenuActions({
    sequence,
    onChanged,
  })

  const viewAnalytics = useCallback(async () => {
    const state = useSpacesStore.getState()
    const space = state.spaces.find((s) => s.id === state.activeSpaceId)
    if (!space) return
    const schema = space.schema
    if (!schema) return
    const existing = (schema.views as ViewDef[] | undefined)?.find(
      (v) => v.type === 'email_analytics',
    )
    if (existing) {
      const next: ViewDef = {
        ...existing,
        reporting_config: {
          ...(existing.reporting_config ?? {}),
          sequence_ids: [sequence.id],
        },
      }
      const nextSchema = {
        ...schema,
        views: (schema.views ?? []).map((v) => (v.id === existing.id ? next : v)),
      }
      state.patchActiveSpaceSchema(nextSchema)
      try {
        await updateSpace(space.id, { schema: nextSchema })
      } catch (err) {
        console.error('Persist sequence analytics view failed:', err)
      }
      state.setActiveView(existing.id)
      return
    }
    try {
      const baseView = buildNewViewDef({
        type: 'email_analytics',
        label: 'Email Analytics',
        icon: 'mail',
        description: 'Opens, clicks, and delivery rates',
        newViewId: `email_analytics_${sequence.id.slice(0, 6)}`,
      })
      const newView: ViewDef = {
        ...baseView,
        reporting_config: {
          ...(baseView.reporting_config ?? {}),
          sequence_ids: [sequence.id],
        },
      }
      const nextSchema = { ...schema, views: [...(schema.views ?? []), newView] }
      state.patchActiveSpaceSchema(nextSchema)
      await updateSpace(space.id, { schema: nextSchema })
      state.setActiveView(newView.id)
    } catch (err) {
      console.error('Create sequence analytics view failed:', err)
      toast.error(SPACES_ARTIFACT_TOAST_ERRORS.OPEN_ANALYTICS_FAILED.userMessage)
    }
  }, [sequence.id])

  return {
    ...sharedActions,
    viewAnalytics,
  }
}
