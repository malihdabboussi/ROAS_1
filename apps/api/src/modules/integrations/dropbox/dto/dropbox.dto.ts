import { z } from 'zod'

export const StartDropboxConnectSchema = z.object({
  redirectTo: z.string().url(),
})

export const ListDropboxFilesSchema = z.object({
  path: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  query: z.string().optional(),
})
