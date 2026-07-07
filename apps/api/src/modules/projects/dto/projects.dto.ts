import { z } from 'zod'

export const CreateProjectSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().optional(),
  conversation_id: z.string().uuid().optional().nullable(),
  entry_point: z.string().trim().min(1).optional(),
  dependencies: z.record(z.string(), z.string()).optional(),
  manifest: z.record(z.string(), z.unknown()).optional(),
})

export const UpdateProjectSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().nullable().optional(),
  entry_point: z.string().trim().min(1).optional(),
  dependencies: z.record(z.string(), z.string()).optional(),
  manifest: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(['building', 'ready', 'running', 'stopped', 'error']).optional(),
  deploy_status: z
    .enum(['pending', 'syncing', 'installing', 'starting', 'running', 'stopped', 'error'])
    .optional(),
  deploy_error: z.string().nullable().optional(),
  last_deployed_at: z.string().datetime({ offset: true }).nullable().optional(),
  slug: z.string().trim().min(1).nullable().optional(),
  is_published: z.boolean().optional(),
  published_url: z.string().nullable().optional(),
})

export const UpsertProjectFileSchema = z.object({
  path: z.string().trim().min(1),
  content: z.string(),
})

export const DeleteProjectFileSchema = z.object({
  path: z.string().trim().min(1),
})

export const ImportGitHubProjectSchema = z.object({
  repo_full_name: z
    .string()
    .trim()
    .regex(/^[^/]+\/[^/]+$/),
  branch: z.string().trim().min(1).optional(),
  conversation_id: z.string().uuid().optional().nullable(),
})

export type CreateProjectDto = z.infer<typeof CreateProjectSchema>
export type UpdateProjectDto = z.infer<typeof UpdateProjectSchema>
export type UpsertProjectFileDto = z.infer<typeof UpsertProjectFileSchema>
export type DeleteProjectFileDto = z.infer<typeof DeleteProjectFileSchema>
export type ImportGitHubProjectDto = z.infer<typeof ImportGitHubProjectSchema>
