import { z } from 'zod'

export const TemplateSlugParamSchema = z.object({
  slug: z.string().min(1).max(120),
})

export type TemplateSlugParam = z.infer<typeof TemplateSlugParamSchema>

export const InstantiateTemplateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  campaign_id: z.string().uuid().nullable().optional(),
  visibility: z.enum(['private', 'team']).optional(),
  default_share_level: z.enum(['admin', 'edit', 'view']).optional(),
  include_tasks: z.boolean().optional().default(true),
  include_docs: z.boolean().optional().default(true),
  include_channel: z.boolean().optional().default(true),
  include_automations: z.boolean().optional().default(true),
})

export type InstantiateTemplateDto = z.infer<typeof InstantiateTemplateSchema>
