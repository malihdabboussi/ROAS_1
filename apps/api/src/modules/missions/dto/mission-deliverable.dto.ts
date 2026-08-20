import { z } from 'zod'
import { AgentKeySchema, OrgIdSchema } from './mission-core.dto'

export const CreateDeliverableDtoSchema = z.object({
  mission_id: z.string().uuid(),
  user_id: z.string().uuid(),
  org_id: OrgIdSchema,
  agent_key: AgentKeySchema,
  type: z.enum([
    'doc',
    'text',
    'image',
    'video',
    'pdf',
    'file',
    'offer',
    'funnel',
    'presentation',
    'sequence',
    'blog_post',
    'social_post',
    'ad',
    'ad_campaign',
    'avatar',
    'website',
  ]),
  title: z.string().min(1).max(500),
  content: z.string().optional(),
  file_url: z.string().url().optional(),
  file_name: z.string().optional(),
  file_size: z.number().int().min(0).optional(),
  mime_type: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  entity_id: z.string().uuid().optional(),
  entity_table: z.string().max(100).optional(),
})

export type CreateDeliverableDto = z.infer<typeof CreateDeliverableDtoSchema>

export const MissionGoogleDocTabSchema = z.object({
  title: z.string().min(1).max(100),
  html: z.string().min(1).max(750000),
  parent_title: z.string().min(1).max(100).optional(),
})

export const ExportMissionGoogleDocSchema = z
  .object({
    title: z.string().min(1).max(500).optional(),
    deliverable_title: z.string().min(1).max(500).optional(),
    source: z.enum(['mission_deliverables', 'webinar_launch_bible']).optional(),
    tabs: z.array(MissionGoogleDocTabSchema).min(1).max(30).optional(),
  })
  .default({})

export type ExportMissionGoogleDocDto = z.infer<typeof ExportMissionGoogleDocSchema>

export const MissionCommentAttachmentDtoSchema = z.object({
  filename: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(255),
  sizeBytes: z.number().int().min(0),
  fileUrl: z.string().min(1).max(4096),
  text: z.string().max(500000).optional(),
  type: z.enum(['text', 'image', 'video']),
})

export const AddMissionCommentDtoSchema = z.object({
  message: z.string().min(1).max(4000),
  attachments: z.array(MissionCommentAttachmentDtoSchema).max(20).optional(),
  // Set by agent-api when an agent relays a comment; attributes the timeline
  // entry to that agent instead of the human viewer.
  agent_key: z
    .string()
    .regex(/^[a-z0-9_-]+$/i)
    .max(64)
    .optional(),
})

export type AddMissionCommentDto = z.infer<typeof AddMissionCommentDtoSchema>
