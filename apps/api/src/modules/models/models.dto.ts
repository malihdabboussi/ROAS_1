import { z } from 'zod'

export const UpdateWorkspaceModelPreferencesSchema = z.object({
  enabled_model_ids: z.array(z.string().min(1)).min(1),
})

export type UpdateWorkspaceModelPreferencesInput = z.infer<
  typeof UpdateWorkspaceModelPreferencesSchema
>
