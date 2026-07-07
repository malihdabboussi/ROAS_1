import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

export type SpaceAutomationTemplateRow = {
  id: string
  template_key: string
  title: string
  description: string
  badge: string
  featured: boolean
  is_new: boolean
  workflows: string[]
  integration: string | null
  trigger_group: string | null
  sort_order: number
  install_count: number
}

@Injectable()
export class SpaceAutomationTemplatesRepository {
  async listActive(supabase: SupabaseClient): Promise<SpaceAutomationTemplateRow[]> {
    const { data, error } = await supabase
      .from('space_automation_templates')
      .select(
        'id, template_key, title, description, badge, featured, is_new, workflows, integration, trigger_group, sort_order, install_count',
      )
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('title', { ascending: true })
    if (error) throw new BadRequestException(error.message)
    return (data ?? []) as SpaceAutomationTemplateRow[]
  }

  async findActiveByKey(
    supabase: SupabaseClient,
    templateKey: string,
  ): Promise<(SpaceAutomationTemplateRow & { body: Record<string, unknown> }) | null> {
    const { data, error } = await supabase
      .from('space_automation_templates')
      .select(
        'id, template_key, title, description, badge, featured, is_new, workflows, integration, trigger_group, sort_order, install_count, body',
      )
      .eq('template_key', templateKey)
      .eq('is_active', true)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return data as (SpaceAutomationTemplateRow & { body: Record<string, unknown> }) | null
  }

  async incrementInstallCount(supabase: SupabaseClient, templateKey: string): Promise<void> {
    const { data: row, error: readError } = await supabase
      .from('space_automation_templates')
      .select('install_count')
      .eq('template_key', templateKey)
      .maybeSingle()
    if (readError) throw new BadRequestException(readError.message)
    if (!row) return
    const next = Number(row.install_count ?? 0) + 1
    const { error } = await supabase
      .from('space_automation_templates')
      .update({ install_count: next })
      .eq('template_key', templateKey)
    if (error) throw new BadRequestException(error.message)
  }
}
