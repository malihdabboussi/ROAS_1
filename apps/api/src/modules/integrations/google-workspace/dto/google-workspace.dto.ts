import { z } from 'zod'

export const ConnectGoogleWorkspaceSchema = z.object({
  service_account_json: z.string().min(10),
  workspace_admin_email: z.string().email(),
})
export type ConnectGoogleWorkspaceDto = z.infer<typeof ConnectGoogleWorkspaceSchema>

export const CreateCalendarIdentitySchema = z.object({
  calendar_email: z.string().email(),
  display_name: z.string().trim().max(200).optional().nullable(),
})
export type CreateCalendarIdentityDto = z.infer<typeof CreateCalendarIdentitySchema>

export const LinkCalendarIdentitySchema = z.object({
  channel_member_id: z.string().uuid().nullable().optional(),
  vibey_user_id: z.string().uuid().nullable().optional(),
  person_brain_id: z.string().uuid().nullable().optional(),
  personal_connection_label: z.string().trim().max(300).nullable().optional(),
})
export type LinkCalendarIdentityDto = z.infer<typeof LinkCalendarIdentitySchema>

export const CalendarIdentityIdParamSchema = z.object({
  id: z.string().uuid(),
})
export type CalendarIdentityIdParam = z.infer<typeof CalendarIdentityIdParamSchema>

export const PersonAgendaQuerySchema = z.object({
  start: z.string().min(1),
  end: z.string().min(1),
  timezone: z.string().optional(),
  email: z.string().email().optional(),
  person_id: z.string().uuid().optional(),
  vibey_user_id: z.string().uuid().optional(),
  person_brain_id: z.string().uuid().optional(),
  limit_people: z.coerce.number().int().min(1).max(50).optional(),
})
export type PersonAgendaQuery = z.infer<typeof PersonAgendaQuerySchema>
