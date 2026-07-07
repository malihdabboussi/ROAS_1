import { z } from 'zod'

const TransferContextSchema = z.object({
  org_id: z.string().uuid().nullable(),
})

const TransferEntityTypeSchema = z.enum([
  'campaign',
  'artifact',
  'media',
  'project',
  'space',
  'view',
])

export const TransferPreviewSchema = z.object({
  entity_type: TransferEntityTypeSchema,
  entity_id: z.string().min(1),
  artifact_table: z.string().optional(),
  target_context: TransferContextSchema,
  mode: z.enum(['move', 'copy']),
})

export type TransferPreviewInput = z.infer<typeof TransferPreviewSchema>

export const TransferExecuteSchema = z.object({
  entity_type: TransferEntityTypeSchema,
  entity_ids: z.array(z.string().min(1)).min(1).max(20),
  artifact_table: z.string().optional(),
  target_context: TransferContextSchema,
  mode: z.enum(['move', 'copy']),
  options: z
    .object({
      include_domains: z.array(z.string().uuid()).optional(),
      include_email_domains: z.array(z.string().uuid()).optional(),
      include_contacts: z.boolean().optional(),
      target_campaign_id: z.string().uuid().optional(),
      target_space_id: z.string().uuid().optional(),
      exclude_tables: z.array(z.string()).optional(),
    })
    .optional(),
})

export type TransferExecuteInput = z.infer<typeof TransferExecuteSchema>
