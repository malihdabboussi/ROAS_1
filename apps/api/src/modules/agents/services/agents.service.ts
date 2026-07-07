import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { MissionsAgentOperationsService } from '../../missions/services/missions-agent-operations.service'
import { AgentsRepository } from '../repositories/agents.repository'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type CurrentUser = { id: string }

type HireReadyEmployeeBody = {
  role_key: string
  name?: string
  team_id?: string | null
}

type AgentWidgetBody = {
  enabled?: boolean
  title?: string | null
  subtitle?: string | null
  show_subtitle?: boolean
  greeting?: string | null
  accent_color?: string | null
  launcher_icon_url?: string | null
  header_image_url?: string | null
  position?: 'bottom-right' | 'bottom-left'
  allowed_origins?: string[]
  home_config?: Record<string, unknown>
  help_articles?: unknown[]
  help_collections?: unknown[]
  news_items?: unknown[]
  campaign_id?: string | null
}

@Injectable()
export class AgentsService {
  constructor(
    private readonly agentOperations: MissionsAgentOperationsService,
    private readonly agentsRepository: AgentsRepository,
  ) {}

  async hireReadyEmployee(
    user: CurrentUser,
    supabase: SupabaseClient,
    body: HireReadyEmployeeBody,
    scope: RequestScope,
  ) {
    if (scope.orgId) {
      const { data: template, error: templateError } =
        await this.agentsRepository.findEnabledTemplateLevel(supabase, body.role_key)
      if (templateError) throw new BadRequestException(templateError.message)
      const templateLevel = (template?.level as string | undefined) ?? 'employee'
      if (templateLevel === 'c_level') {
        throw new ForbiddenException('C-level agents are platform-managed')
      }
      if (templateLevel === 'manager' && scope.orgRole !== 'owner' && scope.orgRole !== 'admin') {
        throw new ForbiddenException('Only admins can hire managers')
      }
      if (!body.team_id) throw new BadRequestException('team_id required')
      if (scope.orgRole !== 'owner' && scope.orgRole !== 'admin') {
        const { data: membership, error } = await this.agentsRepository.findTeamMembership(
          supabase,
          body.team_id,
          user.id,
        )
        if (error) throw new BadRequestException(error.message)
        if (!membership) throw new ForbiddenException('You can only hire into your teams')
      }
    }
    return this.agentOperations.hireReadyEmployee(supabase, user.id, body, scope.orgId)
  }

  async listAwarenessPoints(user: CurrentUser, supabase: SupabaseClient, scope: RequestScope) {
    const { data } = await this.agentsRepository.listAwarenessPoints(supabase, user.id, scope)
    return data ?? []
  }

  async markAwarenessPointsRead(user: CurrentUser, supabase: SupabaseClient, scope: RequestScope) {
    await this.agentsRepository.markAwarenessPointsRead(supabase, user.id, scope)
    return { ok: true }
  }

  async markAwarenessPointRead(
    user: CurrentUser,
    supabase: SupabaseClient,
    pointId: string,
    scope: RequestScope,
  ) {
    await this.agentsRepository.markAwarenessPointRead(supabase, user.id, pointId, scope)
    return { ok: true }
  }

  async deleteAwarenessPoint(
    user: CurrentUser,
    supabase: SupabaseClient,
    pointId: string,
    scope: RequestScope,
  ) {
    await this.agentsRepository.deleteAwarenessPoint(supabase, user.id, pointId, scope)
    return { ok: true }
  }

  async updateAgentPublicPage(
    user: CurrentUser,
    supabase: SupabaseClient,
    agentKey: string,
    body: { enabled: boolean },
    scope: RequestScope,
  ) {
    await this.agentOperations.assertCanManageAgent(supabase, user.id, agentKey, scope.orgId)
    if (body.enabled) {
      const { data: profile } = await this.agentsRepository.getProfilePublicSlug(supabase, user.id)

      if (!profile?.public_agent_slug) {
        let baseSlug = ''
        if (scope.orgId) {
          const { data: org } = await this.agentsRepository.getOrgSlugName(supabase, scope.orgId)
          baseSlug = (org?.slug || org?.name || '').toLowerCase().replace(/[^a-z0-9]/g, '-')
        }
        if (!baseSlug) {
          const email = await this.agentsRepository.getAuthUserEmail(supabase)
          baseSlug =
            email
              .split('@')[0]
              ?.toLowerCase()
              .replace(/[^a-z0-9]/g, '-') || 'user'
        }
        const slug = baseSlug.replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 32)
        if (slug.length >= 2) {
          const { error: slugError } = await this.agentsRepository.updateProfilePublicSlug(
            supabase,
            user.id,
            slug,
          )
          if (slugError && slugError.code === '23505') {
            const uniqueSlug = `${slug.slice(0, 26)}-${Date.now().toString(36).slice(-5)}`
            await this.agentsRepository.updateProfilePublicSlug(supabase, user.id, uniqueSlug)
          }
        }
      }
    }

    const { error } = await this.agentsRepository.updateAgentPublicPageEnabled(
      supabase,
      agentKey,
      user.id,
      scope,
      !!body.enabled,
    )
    if (error) throw new BadRequestException(error.message)

    const { data: updatedProfile } = await this.agentsRepository.getProfilePublicSlug(
      supabase,
      user.id,
    )

    return {
      ok: true,
      public_page_enabled: !!body.enabled,
      public_agent_slug: updatedProfile?.public_agent_slug ?? null,
    }
  }

  async getAgentWidget(
    user: CurrentUser,
    supabase: SupabaseClient,
    agentKey: string,
    scope: RequestScope,
  ) {
    const { data, error } = await this.agentsRepository.getAgentWidget(
      supabase,
      agentKey,
      user.id,
      scope,
    )
    if (error) throw new BadRequestException(error.message)

    const publicAgentSlug = await this.resolveWidgetPublicSlug(supabase, user.id, scope.orgId)

    return {
      ok: true,
      widget: data
        ? {
            public_page_token: data.public_page_token,
            widget_enabled: !!data.widget_enabled,
            widget_title: data.widget_title ?? null,
            widget_subtitle: data.widget_subtitle ?? null,
            widget_show_subtitle: data.widget_show_subtitle !== false,
            widget_greeting: data.widget_greeting ?? null,
            widget_accent_color: data.widget_accent_color ?? null,
            widget_launcher_icon_url: data.widget_launcher_icon_url ?? null,
            widget_header_image_url: data.widget_header_image_url ?? null,
            widget_position: data.widget_position ?? 'bottom-right',
            widget_allowed_origins: (data.widget_allowed_origins as string[]) ?? [],
            widget_home_config: data.widget_home_config ?? {},
            widget_help_articles: data.widget_help_articles ?? [],
            widget_help_collections: data.widget_help_collections ?? [],
            widget_news_items: data.widget_news_items ?? [],
            widget_campaign_id: data.widget_campaign_id ?? null,
          }
        : null,
      public_agent_slug: publicAgentSlug,
    }
  }

  async updateAgentWidget(
    user: CurrentUser,
    supabase: SupabaseClient,
    agentKey: string,
    body: AgentWidgetBody,
    scope: RequestScope,
  ) {
    await this.agentOperations.assertCanManageAgent(supabase, user.id, agentKey, scope.orgId)
    if (body.enabled) {
      const { data: profile } = await this.agentsRepository.getProfilePublicSlug(supabase, user.id)

      if (!profile?.public_agent_slug) {
        await this.updateAgentPublicPage(user, supabase, agentKey, { enabled: true }, scope)
      }
    }

    const patch: Record<string, unknown> = {}
    if (body.enabled !== undefined) patch.widget_enabled = !!body.enabled
    if (body.title !== undefined) patch.widget_title = body.title
    if (body.subtitle !== undefined) patch.widget_subtitle = body.subtitle
    if (body.show_subtitle !== undefined) patch.widget_show_subtitle = !!body.show_subtitle
    if (body.greeting !== undefined) patch.widget_greeting = body.greeting
    if (body.accent_color !== undefined) patch.widget_accent_color = body.accent_color
    if (body.launcher_icon_url !== undefined)
      patch.widget_launcher_icon_url = body.launcher_icon_url
    if (body.header_image_url !== undefined) patch.widget_header_image_url = body.header_image_url
    if (body.position !== undefined) {
      if (body.position !== 'bottom-right' && body.position !== 'bottom-left') {
        throw new BadRequestException('invalid_position')
      }
      patch.widget_position = body.position
    }
    if (body.allowed_origins !== undefined) {
      const normalized = (body.allowed_origins ?? [])
        .map((o) => (typeof o === 'string' ? o.trim().replace(/\/$/, '') : ''))
        .filter((o) => o.length > 0)
      patch.widget_allowed_origins = normalized
    }

    if (body.home_config !== undefined) patch.widget_home_config = body.home_config
    if (body.help_articles !== undefined) patch.widget_help_articles = body.help_articles
    if (body.help_collections !== undefined) patch.widget_help_collections = body.help_collections
    if (body.news_items !== undefined) patch.widget_news_items = body.news_items
    if (body.campaign_id !== undefined) {
      const campaignId =
        typeof body.campaign_id === 'string' ? body.campaign_id.trim() : body.campaign_id
      if (campaignId !== null && (typeof campaignId !== 'string' || !UUID_RE.test(campaignId))) {
        throw new BadRequestException('invalid_campaign_id')
      }
      if (campaignId) {
        const { data: campaign, error: campaignError } = await this.agentsRepository.findCampaign(
          supabase,
          campaignId,
          scope,
        )
        if (campaignError) throw new BadRequestException(campaignError.message)
        if (!campaign) throw new BadRequestException('campaign_not_found')
      }
      patch.widget_campaign_id = campaignId
    }

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('no_fields')
    }

    const { error } = await this.agentsRepository.updateAgentWidget(
      supabase,
      agentKey,
      user.id,
      scope,
      patch,
    )
    if (error) throw new BadRequestException(error.message)

    return this.getAgentWidget(user, supabase, agentKey, scope)
  }

  private async resolveWidgetPublicSlug(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<string | null> {
    if (orgId) {
      const { data: org } = await this.agentsRepository.getOrgSlugName(supabase, orgId)
      return org?.slug ?? null
    }

    const { data: profile } = await this.agentsRepository.getProfilePublicSlug(supabase, userId)
    return profile?.public_agent_slug ?? null
  }
}
