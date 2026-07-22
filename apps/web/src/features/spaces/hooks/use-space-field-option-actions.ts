import { useCallback } from 'react'
import { toast } from 'sonner'
import {
  resolveSpaceFieldOptionError,
  SPACES_FIELD_OPTION_TOAST_ERRORS,
} from '../config/spaces-toast-errors.config'
import { updateSpace } from '../services/spaces.service'
import type { Space } from '../types'
import type { SelectOption, SpaceSchema } from '../types/space-schema'

export function useSpaceFieldOptionActions(opts: {
  activeSchema: SpaceSchema | undefined
  activeSpace: Space | null
  patchActiveSpaceSchema: (patch: Partial<SpaceSchema> | SpaceSchema) => void
  refresh: () => Promise<void>
}) {
  const { activeSchema, activeSpace, patchActiveSpaceSchema, refresh } = opts

  const handleCreateFieldOption = useCallback(
    async (fieldId: string, option: SelectOption) => {
      if (!activeSchema || !activeSpace) return
      const nextFields = activeSchema.fields.map((f) =>
        f.id === fieldId ? { ...f, options: [...(f.options ?? []), option] } : f,
      )
      const nextSchema = { ...activeSchema, fields: nextFields }
      patchActiveSpaceSchema(nextSchema)
      try {
        await updateSpace(
          activeSpace.id,
          { schema: nextSchema },
          {
            orgId: activeSpace.org_id,
            resilient: true,
          },
        )
      } catch (error) {
        toast.error(
          resolveSpaceFieldOptionError(
            error,
            SPACES_FIELD_OPTION_TOAST_ERRORS.CREATE_FAILED.userMessage,
          ),
        )
        await refresh()
      }
    },
    [activeSchema, activeSpace, patchActiveSpaceSchema, refresh],
  )

  const handleUpdateFieldOption = useCallback(
    async (fieldId: string, optionId: string, updates: Partial<SelectOption>) => {
      if (!activeSchema || !activeSpace) return
      const nextFields = activeSchema.fields.map((f) => {
        if (f.id !== fieldId) return f
        return {
          ...f,
          options: (f.options ?? []).map((o) => (o.id === optionId ? { ...o, ...updates } : o)),
        }
      })
      const nextSchema = { ...activeSchema, fields: nextFields }
      patchActiveSpaceSchema(nextSchema)
      try {
        await updateSpace(
          activeSpace.id,
          { schema: nextSchema },
          {
            orgId: activeSpace.org_id,
            resilient: true,
          },
        )
      } catch (error) {
        toast.error(
          resolveSpaceFieldOptionError(
            error,
            SPACES_FIELD_OPTION_TOAST_ERRORS.UPDATE_FAILED.userMessage,
          ),
        )
        await refresh()
      }
    },
    [activeSchema, activeSpace, patchActiveSpaceSchema, refresh],
  )

  const handleDeleteFieldOption = useCallback(
    async (fieldId: string, optionId: string) => {
      if (!activeSchema || !activeSpace) return
      const nextFields = activeSchema.fields.map((f) => {
        if (f.id !== fieldId) return f
        return { ...f, options: (f.options ?? []).filter((o) => o.id !== optionId) }
      })
      const nextSchema = { ...activeSchema, fields: nextFields }
      patchActiveSpaceSchema(nextSchema)
      try {
        await updateSpace(
          activeSpace.id,
          { schema: nextSchema },
          {
            orgId: activeSpace.org_id,
            resilient: true,
          },
        )
        toast.success('Tag deleted')
      } catch (error) {
        toast.error(
          resolveSpaceFieldOptionError(
            error,
            SPACES_FIELD_OPTION_TOAST_ERRORS.DELETE_FAILED.userMessage,
          ),
        )
        await refresh()
      }
    },
    [activeSchema, activeSpace, patchActiveSpaceSchema, refresh],
  )

  const handleTagCustomSwatchesChange = useCallback(
    async (fieldId: string, swatches: string[]) => {
      if (!activeSchema || !activeSpace) return
      const nextFields = activeSchema.fields.map((f) =>
        f.id === fieldId ? { ...f, tag_custom_swatches: swatches } : f,
      )
      const nextSchema = { ...activeSchema, fields: nextFields }
      patchActiveSpaceSchema(nextSchema)
      try {
        await updateSpace(
          activeSpace.id,
          { schema: nextSchema },
          {
            orgId: activeSpace.org_id,
            resilient: true,
          },
        )
      } catch {
        await refresh()
        toast.error(SPACES_FIELD_OPTION_TOAST_ERRORS.COLORS_FAILED.userMessage)
      }
    },
    [activeSchema, activeSpace, patchActiveSpaceSchema, refresh],
  )

  return {
    handleCreateFieldOption,
    handleUpdateFieldOption,
    handleDeleteFieldOption,
    handleTagCustomSwatchesChange,
  }
}
