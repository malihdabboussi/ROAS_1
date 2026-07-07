import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  SpaceTemplateAutomationRow,
  SpaceTemplateDetailRow,
  SpaceTemplateInstantiateResult,
  SpaceTemplateItemRow,
  SpaceTemplateRow,
} from '../types'

@Injectable()
export class SpaceTemplatesRepository {
  async listPublished(supabase: SupabaseClient): Promise<SpaceTemplateRow[]> {
    const { data, error } = await supabase
      .from('space_templates')
      .select(
        'id, slug, title, description, icon, icon_color, category, persona, badge, featured, is_new, schema, channel_name, channel_description, sort_order',
      )
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .order('title', { ascending: true })
    if (error) throw new BadRequestException(error.message)
    return (data ?? []) as SpaceTemplateRow[]
  }

  async findPublishedBySlug(
    supabase: SupabaseClient,
    slug: string,
  ): Promise<SpaceTemplateRow | null> {
    const { data, error } = await supabase
      .from('space_templates')
      .select(
        'id, slug, title, description, icon, icon_color, category, persona, badge, featured, is_new, schema, channel_name, channel_description, sort_order',
      )
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return (data as SpaceTemplateRow | null) ?? null
  }

  async listItemsByTemplateId(
    supabase: SupabaseClient,
    templateId: string,
  ): Promise<SpaceTemplateItemRow[]> {
    const { data, error } = await supabase
      .from('space_template_items')
      .select(
        'id, template_id, kind, title, status, priority, description, body, custom_data, sort_order',
      )
      .eq('template_id', templateId)
      .order('sort_order', { ascending: true })
    if (error) throw new BadRequestException(error.message)
    return (data ?? []) as SpaceTemplateItemRow[]
  }

  async listAutomationsByTemplateId(
    supabase: SupabaseClient,
    templateId: string,
  ): Promise<SpaceTemplateAutomationRow[]> {
    const { data, error } = await supabase
      .from('space_template_automations')
      .select('id, template_id, name, trigger, actions, sort_order')
      .eq('template_id', templateId)
      .order('sort_order', { ascending: true })
    if (error) throw new BadRequestException(error.message)
    return (data ?? []) as SpaceTemplateAutomationRow[]
  }

  async getDetailBySlug(supabase: SupabaseClient, slug: string): Promise<SpaceTemplateDetailRow> {
    const template = await this.findPublishedBySlug(supabase, slug)
    if (!template) throw new NotFoundException('Template not found')

    const [items, automations] = await Promise.all([
      this.listItemsByTemplateId(supabase, template.id),
      this.listAutomationsByTemplateId(supabase, template.id),
    ])

    const task_count = items.filter((i) => i.kind === 'task').length
    const doc_count = items.filter((i) => i.kind === 'doc').length

    return {
      ...template,
      task_count,
      doc_count,
      automation_count: automations.length,
      has_channel: !!template.channel_name,
    }
  }

  async instantiate(
    supabase: SupabaseClient,
    input: {
      slug: string
      title?: string
      orgId: string | null
      campaignId?: string | null
      visibility?: 'private' | 'team'
      defaultShareLevel?: 'admin' | 'edit' | 'view'
      includeTasks?: boolean
      includeDocs?: boolean
      includeChannel?: boolean
      includeAutomations?: boolean
    },
  ): Promise<SpaceTemplateInstantiateResult> {
    const { data, error } = await supabase.rpc('instantiate_space_template', {
      p_slug: input.slug,
      p_title: input.title ?? null,
      p_org_id: input.orgId,
      p_campaign_id: input.campaignId ?? null,
      p_visibility: input.visibility ?? 'team',
      p_default_share_level: input.defaultShareLevel ?? null,
      p_include_tasks: input.includeTasks ?? true,
      p_include_docs: input.includeDocs ?? true,
      p_include_channel: input.includeChannel ?? true,
      p_include_automations: input.includeAutomations ?? true,
    })
    if (error) throw new BadRequestException(error.message)
    const result = (data ?? {}) as Partial<SpaceTemplateInstantiateResult>
    return {
      space: (result.space ?? {}) as Record<string, unknown>,
      automations: Array.isArray(result.automations)
        ? (result.automations as Record<string, unknown>[])
        : [],
    }
  }
}
