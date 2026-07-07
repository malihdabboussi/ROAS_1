'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import { updateSpace } from '@/features/spaces/services/spaces.service'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import type { Space, SpaceSchema, ViewDef } from '@/features/spaces/types'
import type { Form, FormSettings } from '@/lib/forms/forms-api'
import { SPACES_ARTIFACT_TOAST_SUCCESS } from '../../../config/spaces-toast-errors.config'

function responseViewIdForForm(formId: string): string {
  return `form_responses_${formId.slice(0, 8)}`
}

function buildResponsesView(form: Pick<Form, 'id' | 'name'>): ViewDef {
  return {
    id: responseViewIdForForm(form.id),
    type: 'form_responses',
    name: `${form.name || 'Form'} Responses`,
    icon: 'inbox',
    icon_color: 'blue',
    _form_id: form.id,
  }
}

function resolveResponsesView(
  schema: SpaceSchema,
  form: Pick<Form, 'id' | 'name' | 'settings'>,
): { schema: SpaceSchema; viewId: string; created: boolean } {
  const existingBySettings = form.settings.responses_view_id
    ? schema.views.find((view) => view.id === form.settings.responses_view_id)
    : null
  if (existingBySettings?.id) {
    return { schema, viewId: existingBySettings.id, created: false }
  }

  const existingByForm = schema.views.find(
    (view) => view.type === 'form_responses' && view._form_id === form.id,
  )
  if (existingByForm?.id) {
    return { schema, viewId: existingByForm.id, created: false }
  }

  const view = buildResponsesView(form)
  return { schema: { ...schema, views: [...schema.views, view] }, viewId: view.id, created: true }
}

export function useFormBindToSpace({
  form,
  onSettingsChange,
}: {
  form: Pick<Form, 'id' | 'name' | 'settings'>
  onSettingsChange: (settings: FormSettings) => void
}) {
  const activeSpaceId = useSpacesStore((state) => state.activeSpaceId)
  const patchActiveSpaceSchema = useSpacesStore((state) => state.patchActiveSpaceSchema)

  return useCallback(
    async (space: Space) => {
      const schema = (space.schema ?? {
        version: 1,
        fields: [],
        views: [],
      }) as SpaceSchema
      const resolved = resolveResponsesView(schema, form)
      if (resolved.created) {
        await updateSpace(space.id, { schema: resolved.schema })
        if (activeSpaceId === space.id) {
          patchActiveSpaceSchema(resolved.schema as unknown as Record<string, unknown>)
        }
        toast.success(SPACES_ARTIFACT_TOAST_SUCCESS.RESPONSES_VIEW_CREATED.userMessage)
      }

      onSettingsChange({
        ...(form.settings ?? {}),
        target_space_id: space.id,
        responses_view_id: resolved.viewId,
      })
    },
    [activeSpaceId, form, onSettingsChange, patchActiveSpaceSchema],
  )
}
