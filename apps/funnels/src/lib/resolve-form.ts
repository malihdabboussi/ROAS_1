import { getServiceClient } from './supabase'

export type PublicFormQuestion = {
  id: string
  type: string
  label: string
  description?: string
  placeholder?: string
  required?: boolean
  hidden?: boolean
  options?: Array<{
    id: string
    label: string
    color?: string
    group?: 'not_started' | 'active' | 'done' | 'closed'
  }>
  contact_subfields?: string[]
}

export type PublicForm = {
  id: string
  name: string
  share_token: string
  visibility: 'public' | 'auth' | 'embed_only'
  schema: {
    title?: string
    description?: string
    questions: PublicFormQuestion[]
  }
  settings: Record<string, unknown>
}

export async function resolveFormByToken(token: string): Promise<PublicForm | null> {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('forms')
    .select('id, name, share_token, visibility, schema, settings')
    .eq('share_token', token)
    .eq('status', 'published')
    .maybeSingle()

  if (error || !data) return null
  return data as PublicForm
}

/** Fallback when select/multi questions have no options stored (matches web form builder defaults). */
export function effectiveFormSelectOptions(
  options?: Array<{
    id: string
    label: string
    color?: string
    group?: 'not_started' | 'active' | 'done' | 'closed'
  }> | null,
): Array<{
  id: string
  label: string
  color?: string
  group?: 'not_started' | 'active' | 'done' | 'closed'
}> {
  if (options && options.length > 0) return options
  return [
    { id: 'opt_1', label: 'Option 1', color: 'purple' },
    { id: 'opt_2', label: 'Option 2', color: 'blue' },
  ]
}
