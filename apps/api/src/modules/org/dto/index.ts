import { z } from 'zod'

export const ORG_ROLES = ['owner', 'admin', 'creator', 'editor', 'viewer'] as const
export type OrgRole = (typeof ORG_ROLES)[number]

export const INVITABLE_ROLES = ['admin', 'creator', 'editor', 'viewer'] as const
export type InvitableRole = (typeof INVITABLE_ROLES)[number]

export const CreateOrgSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less')
    .trim(),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug must be 50 characters or less')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only')
    .trim(),
  avatar_url: z.string().url().optional().nullable(),
})

export type CreateOrgInput = z.infer<typeof CreateOrgSchema>

export const UpdateOrgSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/)
    .trim()
    .optional(),
  avatar_url: z.string().url().optional().nullable(),
  settings: z.record(z.unknown()).optional(),
  website: z.string().max(500).optional().nullable(),
  industry: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
})

export type UpdateOrgInput = z.infer<typeof UpdateOrgSchema>

export const OrgIdParamSchema = z.object({
  orgId: z.string().uuid('Invalid organization ID'),
})

export type OrgIdParam = z.infer<typeof OrgIdParamSchema>

export const InviteMemberSchema = z.object({
  email: z.string().email('Valid email address required').trim().toLowerCase(),
  role: z.enum(INVITABLE_ROLES).default('editor'),
})

export type InviteMemberInput = z.infer<typeof InviteMemberSchema>

export const AcceptInvitationSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
})

export type AcceptInvitationInput = z.infer<typeof AcceptInvitationSchema>

export const ChangeMemberRoleSchema = z.object({
  role: z.enum(INVITABLE_ROLES),
})

export type ChangeMemberRoleInput = z.infer<typeof ChangeMemberRoleSchema>

export const MemberIdParamSchema = z.object({
  orgId: z.string().uuid('Invalid organization ID'),
  memberId: z.string().uuid('Invalid member ID'),
})

export type MemberIdParam = z.infer<typeof MemberIdParamSchema>

export const InvitationIdParamSchema = z.object({
  orgId: z.string().uuid('Invalid organization ID'),
  invitationId: z.string().uuid('Invalid invitation ID'),
})

export type InvitationIdParam = z.infer<typeof InvitationIdParamSchema>

export const UpdateCreditLimitSchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly', 'uncapped']),
  credit_limit: z.number().positive().nullable(),
})

export type UpdateCreditLimitInput = z.infer<typeof UpdateCreditLimitSchema>

export const UpdateOrgAutoRechargeSchema = z.object({
  enabled: z.boolean(),
  triggerCredits: z.number().int().min(0),
  topupCredits: z
    .number()
    .int()
    .min(2000)
    .refine((value) => value % 200 === 0, {
      message: 'topupCredits must be a multiple of 200',
    }),
  monthlyCap: z.number().int().min(1000).nullable().optional(),
})

export type UpdateOrgAutoRechargeInput = z.infer<typeof UpdateOrgAutoRechargeSchema>

export const TransferCampaignSchema = z.object({
  campaign_ids: z.array(z.string().uuid()).min(1).max(20),
  mode: z.enum(['move', 'copy']),
  include_contacts: z.boolean().optional().default(false),
  move_domains: z.array(z.string().uuid()).optional().default([]),
  move_email_domains: z.array(z.string().uuid()).optional().default([]),
})

export type TransferCampaignInput = z.infer<typeof TransferCampaignSchema>

export const TransferPreviewSchema = z.object({
  campaign_id: z.string().uuid(),
})

export type TransferPreviewInput = z.infer<typeof TransferPreviewSchema>

export const ImportAgentsSchema = z.object({
  agent_keys: z.array(z.string().min(1)).min(1).max(50),
  include_brains: z.boolean().optional().default(false),
})

export type ImportAgentsInput = z.infer<typeof ImportAgentsSchema>

export const ShareBrainSchema = z.object({
  brain_id: z.string().uuid(),
  entity_type: z.enum(['user', 'org', 'team']).optional(),
  entity_id: z.string().uuid().optional(),
  level: z.enum(['view', 'query', 'train']).optional(),
  permission: z.enum(['view', 'query']).optional(),
})

export type ShareBrainInput = z.infer<typeof ShareBrainSchema>

export const BrainShareParamSchema = z.object({
  orgId: z.string().uuid(),
  brainId: z.string().uuid(),
})

export type BrainShareParam = z.infer<typeof BrainShareParamSchema>

export const CampaignSharingParamSchema = z.object({
  orgId: z.string().uuid(),
  campaignId: z.string().uuid(),
})

export type CampaignSharingParam = z.infer<typeof CampaignSharingParamSchema>

export const CampaignPermissionMemberParamSchema = z.object({
  orgId: z.string().uuid(),
  campaignId: z.string().uuid(),
  memberId: z.string().uuid(),
})

export type CampaignPermissionMemberParam = z.infer<typeof CampaignPermissionMemberParamSchema>

export const UpsertCampaignPermissionSchema = z.object({
  permission: z.enum(['view', 'edit']),
})

export type UpsertCampaignPermissionInput = z.infer<typeof UpsertCampaignPermissionSchema>

export const UpsertBrainSharingSchema = z.object({
  entity_type: z.enum(['user', 'org', 'team']).optional(),
  entity_id: z.string().uuid().optional(),
  level: z.enum(['view', 'query', 'train']).optional(),
  permission: z.enum(['view', 'query']).optional(),
})

export type UpsertBrainSharingInput = z.infer<typeof UpsertBrainSharingSchema>

export const BrainShareIdParamSchema = z.object({
  orgId: z.string().uuid(),
  brainId: z.string().uuid(),
  shareId: z.string().uuid(),
})

export type BrainShareIdParam = z.infer<typeof BrainShareIdParamSchema>
