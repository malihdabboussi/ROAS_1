import { z } from 'zod'

export const FormVisibilitySchema = z.enum(['public', 'auth', 'embed_only'])
export const FormStatusSchema = z.enum(['draft', 'published', 'archived'])

export const FormQuestionTypeSchema = z.enum([
  'short_text',
  'long_text',
  'dates',
  'single_select',
  'multi_select',
  'checkbox',
  'contact',
  'people',
  'uploads',
  'number',
  'signature',
  'task_property',
  'info_block',
])

export const FormQuestionOptionSchema = z.object({
  id: z.string().min(1).max(200),
  label: z.string().min(1).max(200),
  color: z.string().max(200).optional(),
  group: z.enum(['not_started', 'active', 'done', 'closed']).optional(),
})

export const FormQuestionSchema = z
  .object({
    id: z.string().min(1).max(200),
    type: FormQuestionTypeSchema,
    label: z.string().max(500),
    description: z.string().max(2000).optional(),
    placeholder: z.string().max(500).optional(),
    required: z.boolean().optional(),
    hidden: z.boolean().optional(),
    options: z.array(FormQuestionOptionSchema).optional(),
    contact_subfields: z.array(z.string().min(1).max(100)).max(20).optional(),
    property_field_id: z.string().max(200).optional(),
    config: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough()

export const FormSchemaPayload = z
  .object({
    title: z.string().max(500).optional(),
    description: z.string().max(2000).optional(),
    questions: z.array(FormQuestionSchema).max(100).default([]),
  })
  .passthrough()

export const FormSettingsPayload = z
  .object({
    target_space_id: z.string().uuid().nullable().optional(),
    redirect_url: z.string().max(2048).nullable().optional(),
    button_label: z.string().max(200).optional(),
    layout: z.enum(['one_column', 'two_column']).optional(),
    theme: z.enum(['light', 'dark']).optional(),
    visibility: FormVisibilitySchema.optional(),
    hide_branding: z.boolean().optional(),
    add_answers_to_description: z.boolean().optional(),
    show_resubmit_button: z.boolean().optional(),
    show_recaptcha: z.boolean().optional(),
    colors: z.record(z.string(), z.unknown()).optional(),
    cover_url: z.string().max(2048).nullable().optional(),
    cover_focal_y: z.number().min(0).max(100).optional(),
    icon: z.string().max(100).optional(),
    icon_color: z.string().max(100).optional(),
    icon_image_url: z.string().max(2048).nullable().optional(),
    responses_view_id: z.string().max(200).nullable().optional(),
    assignee_type: z.enum(['human', 'agent', 'unassigned']).optional(),
    assignee_id: z.string().max(200).nullable().optional(),
    task_title_question_id: z.string().max(200).nullable().optional(),
    end_page_icon: z.string().max(100).optional(),
    end_page_icon_color: z.string().max(100).optional(),
    end_page_icon_image_url: z.string().max(2048).nullable().optional(),
    end_page_title: z.string().max(500).optional(),
    end_page_message: z.string().max(2000).optional(),
  })
  .passthrough()
  .default({})

export const CreateFormSchema = z.object({
  name: z.string().min(1).max(500),
  campaign_id: z.string().uuid(),
  space_id: z.string().uuid().nullable().optional(),
  visibility: FormVisibilitySchema.optional(),
  schema: FormSchemaPayload.optional(),
  settings: FormSettingsPayload.optional(),
})
export type CreateFormDto = z.infer<typeof CreateFormSchema>

export const UpdateFormSchema = z
  .object({
    name: z.string().min(1).max(500).optional(),
    space_id: z.string().uuid().nullable().optional(),
    visibility: FormVisibilitySchema.optional(),
    schema: FormSchemaPayload.optional(),
    settings: FormSettingsPayload.optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.space_id !== undefined ||
      value.visibility !== undefined ||
      value.schema !== undefined ||
      value.settings !== undefined,
    { message: 'At least one update field is required' },
  )
export type UpdateFormDto = z.infer<typeof UpdateFormSchema>

export const FormIdParamSchema = z.object({ id: z.string().uuid() })
export type FormIdParam = z.infer<typeof FormIdParamSchema>

export const PublicFormTokenParamSchema = z.object({ token: z.string().min(8).max(200) })
export type PublicFormTokenParam = z.infer<typeof PublicFormTokenParamSchema>

export const SubmitFormSchema = z.object({
  answers: z.record(z.string(), z.unknown()),
  turnstile_token: z.string().min(1).max(2048).optional(),
})
export type SubmitFormDto = z.infer<typeof SubmitFormSchema>
