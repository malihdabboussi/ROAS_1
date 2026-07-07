import {
  backendDelete,
  backendGet,
  backendPatch,
  backendPost,
} from '@/lib/api/backend-client'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'

export type FormQuestionType =
  | 'short_text'
  | 'long_text'
  | 'dates'
  | 'single_select'
  | 'multi_select'
  | 'checkbox'
  | 'contact'
  | 'people'
  | 'uploads'
  | 'number'
  | 'signature'
  | 'task_property'
  | 'info_block'

/** Mirrors space `SelectOption` for tags, status, category, etc. */
export type FormQuestionOption = {
  id: string
  label: string
  color?: string
  group?: 'not_started' | 'active' | 'done' | 'closed'
}

export interface FormQuestion {
  id: string
  type: FormQuestionType
  label: string
  description?: string
  placeholder?: string
  required?: boolean
  hidden?: boolean
  options?: FormQuestionOption[]
  property_field_id?: string
  config?: Record<string, unknown>
  /** For type === 'contact'. Ordered list of contact subfield ids to render. */
  contact_subfields?: string[]
}

export interface FormSchema {
  title?: string
  description?: string
  questions: FormQuestion[]
}

export interface FormSettings {
  target_space_id?: string
  redirect_url?: string
  button_label?: string
  layout?: 'one_column' | 'two_column'
  theme?: 'light' | 'dark'
  visibility?: 'public' | 'auth' | 'embed_only'
  hide_branding?: boolean
  add_answers_to_description?: boolean
  show_resubmit_button?: boolean
  show_recaptcha?: boolean
  colors?: Record<string, unknown>
  /** Hero cover image URL shown above the form title (matches docs cover pattern). */
  cover_url?: string
  /** Vertical focal point for cover (0-100, like docs `_doc_cover_focal_y`). */
  cover_focal_y?: number
  /** Lucide icon name shown as the form's logo above the title. */
  icon?: string
  /** Lucide icon color id (one of `ICON_COLORS`). */
  icon_color?: string
  /** Image URL used as the form's logo (takes precedence over `icon` when set). */
  icon_image_url?: string
  /** Auto-created view id in the target space used to show submissions for this form. */
  responses_view_id?: string
  /** Default assignee applied to tasks created from form submissions. */
  assignee_type?: 'human' | 'agent' | 'unassigned'
  assignee_id?: string | null
  /** Question id for task title, or `auto` for contact name -> email -> form submitted fallback. */
  task_title_question_id?: string
  /** End / Thank-you page customization. */
  end_page_icon?: string
  end_page_icon_color?: string
  end_page_icon_image_url?: string
  end_page_title?: string
  end_page_message?: string
}

export interface Form {
  id: string
  user_id: string
  org_id?: string | null
  campaign_id: string
  space_id?: string | null
  name: string
  slug?: string | null
  share_token: string
  status: 'draft' | 'published' | 'archived'
  visibility: 'public' | 'auth' | 'embed_only'
  schema: FormSchema
  settings: FormSettings
  published_url?: string | null
  created_at: string
  updated_at: string
}

export interface FormResponse {
  id: string
  form_id: string
  space_item_id: string | null
  answers: Record<string, unknown>
  submitter_email: string | null
  submitted_at: string
}

/**
 * Campaign-wide list (admin/Studio surfaces). For per-space Forms tab use {@link fetchSpaceForms}.
 */
export async function fetchCampaignForms(campaignId: string): Promise<Form[]> {
  const url = `/api/forms?campaign_id=${campaignId}`
  return cachedFetch(`artifact-list:${url}`, () => backendGet<Form[]>(url))
}

/**
 * Forms owned by a single space (Forms tab in Spaces). `forms.space_id` filter.
 */
export async function fetchSpaceForms(campaignId: string, spaceId: string): Promise<Form[]> {
  const search = new URLSearchParams({ campaign_id: campaignId, space_id: spaceId })
  const url = `/api/forms?${search.toString()}`
  return cachedFetch(`artifact-list:${url}`, () => backendGet<Form[]>(url))
}

export interface FormAggregate {
  form_id: string
  responses_count: number
  last_response_at: string | null
  target_space_id: string | null
  target_space_name: string | null
}

export async function fetchCampaignFormAggregates(campaignId: string): Promise<FormAggregate[]> {
  return backendGet<FormAggregate[]>(`/api/forms/aggregates?campaign_id=${campaignId}`)
}

export async function fetchSpaceFormAggregates(
  campaignId: string,
  spaceId: string,
): Promise<FormAggregate[]> {
  const search = new URLSearchParams({ campaign_id: campaignId, space_id: spaceId })
  return backendGet<FormAggregate[]>(`/api/forms/aggregates?${search.toString()}`)
}

export async function fetchForm(formId: string): Promise<Form> {
  return backendGet<Form>(`/api/forms/${formId}`)
}

export async function createForm(
  campaignId: string,
  data: { name: string; space_id?: string | null },
): Promise<Form> {
  return backendPost<Form>('/api/forms', {
    name: data.name,
    campaign_id: campaignId,
    ...(data.space_id !== undefined ? { space_id: data.space_id } : {}),
  })
}

export async function updateForm(
  formId: string,
  data: {
    name?: string
    space_id?: string | null
    visibility?: Form['visibility']
    schema?: FormSchema
    settings?: FormSettings
  },
): Promise<Form> {
  return backendPatch<Form>(`/api/forms/${formId}`, data)
}

export async function deleteForm(formId: string): Promise<void> {
  return backendDelete(`/api/forms/${formId}`)
}

export async function publishForm(formId: string): Promise<{ success: true; url: string }> {
  return backendPost<{ success: true; url: string }>(`/api/forms/${formId}/publish`, {})
}

export async function unpublishForm(formId: string): Promise<{ success: true; status: 'draft' }> {
  return backendPost<{ success: true; status: 'draft' }>(`/api/forms/${formId}/unpublish`, {})
}

export async function fetchFormResponses(formId: string): Promise<FormResponse[]> {
  return backendGet<FormResponse[]>(`/api/forms/${formId}/responses`)
}
