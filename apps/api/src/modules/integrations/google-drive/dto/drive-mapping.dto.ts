import { z } from 'zod'

export const SpaceDriveMappingSpaceParamSchema = z.object({
  spaceId: z.string().uuid(),
})

export const SpaceDriveMappingIdParamSchema = z.object({
  id: z.string().uuid(),
})

export const CreateDriveFolderMappingSchema = z.object({
  drive_folder_id: z.string().min(1),
  drive_folder_name: z.string().min(1),
  drive_id: z.string().min(1).optional(),
  source: z.enum(['my_drive', 'shared_with_me', 'shared_drives']).optional(),
})

export const UpdateDriveFolderMappingSchema = z
  .object({
    enabled: z.boolean().optional(),
    sync_interval_seconds: z.coerce.number().int().min(60).max(86400).optional(),
  })
  .refine((value) => value.enabled !== undefined || value.sync_interval_seconds !== undefined, {
    message: 'At least one field must be provided',
  })

export const DeleteDriveFolderMappingSchema = z.object({
  delete_synced_items: z.boolean().optional().default(true),
})

export type SpaceDriveMappingSpaceParam = z.infer<typeof SpaceDriveMappingSpaceParamSchema>
export type SpaceDriveMappingIdParam = z.infer<typeof SpaceDriveMappingIdParamSchema>
export type CreateDriveFolderMappingDto = z.infer<typeof CreateDriveFolderMappingSchema>
export type UpdateDriveFolderMappingDto = z.infer<typeof UpdateDriveFolderMappingSchema>
export type DeleteDriveFolderMappingDto = z.infer<typeof DeleteDriveFolderMappingSchema>
