import { z } from 'zod'

export const StartGoogleDriveConnectSchema = z.object({
  redirectTo: z.string().url(),
})

export const ListDriveFilesSchema = z.object({
  folderId: z.string().optional(),
  pageToken: z.string().optional(),
  pageSize: z.coerce.number().min(1).max(100).optional(),
  query: z.string().optional(),
  source: z.enum(['my_drive', 'shared_with_me', 'shared_drives']).optional(),
  driveId: z.string().optional(),
})

export const UploadDriveFileSchema = z.object({
  name: z.string().min(1),
  mimeType: z.string().min(1),
  folderId: z.string().optional(),
})

export const CreateGoogleDocSchema = z.object({
  title: z.string().trim().min(1).max(250),
  html: z.string().trim().min(1).max(5_000_000),
})

export const CreateGoogleDocTabsSchema = z.object({
  title: z.string().trim().min(1).max(250),
  tabs: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(250),
        html: z.string().trim().min(1).max(5_000_000),
      }),
    )
    .min(1)
    .max(40),
})
