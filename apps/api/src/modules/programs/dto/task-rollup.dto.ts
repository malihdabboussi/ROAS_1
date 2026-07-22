import { z } from 'zod'

export const TaskRollupQuerySchema = z.object({
  view: z.enum(['my', 'all']).default('my'),
  program_id: z.string().uuid().optional(),
  campaign_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(200),
})
export type TaskRollupQuery = z.infer<typeof TaskRollupQuerySchema>

export type TaskRollupItem = {
  id: string
  title: string
  status: string
  due_at: string | null
  assignee_user_id: string | null
  assignees: Array<{ type: 'human' | 'agent'; id: string }>
  space_id: string
  space_title: string
  campaign_id: string | null
  campaign_name: string | null
  program_id: string | null
  program_name: string | null
  source_url: string
  created_at: string
  updated_at: string | null
}
