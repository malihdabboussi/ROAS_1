import { z } from 'zod'

export const ChannelIdParamSchema = z.object({
  id: z.string().uuid('Invalid channel ID format'),
})

export type ChannelIdParam = z.infer<typeof ChannelIdParamSchema>

export const ChannelMemberParamSchema = z.object({
  id: z.string().uuid('Invalid channel ID format'),
  memberId: z.string().uuid('Invalid member ID format'),
})

export type ChannelMemberParam = z.infer<typeof ChannelMemberParamSchema>

export const ChannelMessageParamSchema = z.object({
  id: z.string().uuid('Invalid channel ID format'),
  messageId: z.string().uuid('Invalid message ID format'),
})

export type ChannelMessageParam = z.infer<typeof ChannelMessageParamSchema>

export const ListChannelMessagesQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 50))
    .pipe(z.number().int().min(1).max(200)),
  before: z.string().datetime().optional(),
})

export type ListChannelMessagesQuery = z.infer<typeof ListChannelMessagesQuerySchema>

export const CreateChannelSchema = z.object({
  name: z.string().trim().min(1, 'Channel name is required').max(120),
  description: z.string().trim().max(500).optional().nullable(),
  is_private: z.boolean().optional(),
})

export type CreateChannelInput = z.infer<typeof CreateChannelSchema>

export const UpdateChannelSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  is_private: z.boolean().optional(),
  icon: z.string().trim().min(1).max(80).optional(),
  icon_color: z.string().trim().min(1).max(40).optional(),
  /**
   * Campaign context binding for this channel. Agents invoked here scope
   * their artifact tools to this campaign when no explicit space scope is
   * provided. `null` clears the binding.
   */
  default_campaign_id: z.string().uuid().optional().nullable(),
})

export type UpdateChannelInput = z.infer<typeof UpdateChannelSchema>

export const PatchChannelMessageMetadataSchema = z.object({
  content_blocks_ordered: z.array(z.record(z.string(), z.unknown())),
})

export type PatchChannelMessageMetadataInput = z.infer<typeof PatchChannelMessageMetadataSchema>

export const AddChannelMemberSchema = z
  .object({
    member_type: z.enum(['user', 'agent']),
    user_id: z.string().uuid().optional(),
    agent_key: z.string().trim().min(1).max(120).optional(),
    role: z.enum(['admin', 'edit', 'view']).optional(),
  })
  .refine(
    (value) =>
      (value.member_type === 'user' && !!value.user_id && !value.agent_key) ||
      (value.member_type === 'agent' && !value.user_id && !!value.agent_key),
    {
      message: 'For user members, provide user_id only. For agent members, provide agent_key only.',
    },
  )

export type AddChannelMemberInput = z.infer<typeof AddChannelMemberSchema>

export const UpdateChannelMemberSchema = z.object({
  role: z.enum(['admin', 'edit', 'view']),
})

export type UpdateChannelMemberInput = z.infer<typeof UpdateChannelMemberSchema>

export const SendChannelMessageSchema = z
  .object({
    content: z.string().trim().max(12000).optional(),
    content_blocks: z.array(z.record(z.string(), z.unknown())).optional(),
    reply_to_id: z.string().uuid().optional(),
    mentions: z
      .array(
        z.object({
          type: z.enum(['user', 'agent', 'task', 'doc', 'channel', 'space', 'mission', 'person']),
          user_id: z.string().uuid().optional(),
          agent_key: z.string().trim().min(1).max(120).optional(),
          entity_id: z.string().trim().min(1).max(200).optional(),
          label: z.string().trim().max(120).optional(),
        }),
      )
      .optional(),
    attachments: z.array(z.string().url()).max(10).optional(),
    /**
     * Active space context (set by Spaces channel views). When provided,
     * the server resolves the space's `campaign_id` and forwards both to
     * the channel-agent runtime so artifact tools auto-scope to this space.
     * Silently ignored if the caller cannot see the space (RLS).
     */
    space_id: z.string().uuid().optional(),
  })
  .refine((value) => !!value.content || !!value.content_blocks, {
    message: 'Message content is required.',
  })

export type SendChannelMessageInput = z.infer<typeof SendChannelMessageSchema>

export const PinChannelMessageSchema = z.object({
  pinned: z.boolean(),
})

export type PinChannelMessageInput = z.infer<typeof PinChannelMessageSchema>

export const EditChannelMessageSchema = z.object({
  content: z.string().trim().min(1, 'Message content is required').max(12000),
})

export type EditChannelMessageInput = z.infer<typeof EditChannelMessageSchema>

export const RetryAgentSchema = z.object({
  agent_key: z.string().trim().min(1).max(120),
})

export type RetryAgentInput = z.infer<typeof RetryAgentSchema>

export const StartBrainstormSchema = z.object({
  agent_keys: z.array(z.string().trim().min(1).max(120)).min(2).max(10),
  /**
   * Active space context (set by Spaces channel views). When provided,
   * the server resolves the space's `campaign_id` and forwards both to
   * the brainstorm channel-agent runtime.
   */
  space_id: z.string().uuid().optional(),
})

export type StartBrainstormInput = z.infer<typeof StartBrainstormSchema>

export const RenameThreadSchema = z.object({
  thread_name: z.string().trim().max(200).nullable(),
})

export type RenameThreadInput = z.infer<typeof RenameThreadSchema>

export const UpdateChannelUserStateSchema = z.object({
  is_favorite: z.boolean().optional(),
})

export type UpdateChannelUserStateInput = z.infer<typeof UpdateChannelUserStateSchema>
