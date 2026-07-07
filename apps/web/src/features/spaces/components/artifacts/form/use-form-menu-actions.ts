'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import {
  useFormMenuActions as useSharedFormMenuActions,
  type FormMenuActions as SharedFormMenuActions,
  type FormMenuTarget,
} from '@/lib/artifacts'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import { SPACES_ARTIFACT_TOAST_ERRORS } from '../../../config/spaces-toast-errors.config'

export type { FormMenuTarget } from '@/lib/artifacts'

interface UseFormMenuActionsArgs {
  form: FormMenuTarget
  onChanged?: () => void
}

export interface FormMenuActions extends SharedFormMenuActions {
  goToTargetSpace(): void
}

export function useFormMenuActions({
  form,
  onChanged,
}: UseFormMenuActionsArgs): FormMenuActions {
  const sharedActions = useSharedFormMenuActions({ form, onChanged })

  const goToTargetSpace = useCallback(() => {
    const targetSpaceId = form.target_space_id ?? form.space_id ?? null
    if (!targetSpaceId) {
      toast.info(SPACES_ARTIFACT_TOAST_ERRORS.FORM_TARGET_SPACE_MISSING.userMessage)
      return
    }
    const state = useSpacesStore.getState()
    const exists = state.spaces.some((s) => s.id === targetSpaceId)
    if (!exists) {
      toast.error(SPACES_ARTIFACT_TOAST_ERRORS.FORM_TARGET_SPACE_NOT_FOUND.userMessage)
      return
    }
    state.setActiveSpace(targetSpaceId)
  }, [form.target_space_id, form.space_id])

  return {
    ...sharedActions,
    goToTargetSpace,
  }
}
