import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { AgentsService } from '../services/agents.service'

@Controller('agents')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class AgentWidgetController {
  constructor(private readonly agentsService: AgentsService) {}

  @Patch(':agentKey/public-page')
  async updateAgentPublicPage(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('agentKey') agentKey: string,
    @Body() body: { enabled: boolean },
    @OrgContext() scope: RequestScope,
  ) {
    return this.agentsService.updateAgentPublicPage(user, supabase, agentKey, body, scope)
  }

  @Get(':agentKey/widget')
  async getAgentWidget(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('agentKey') agentKey: string,
    @OrgContext() scope: RequestScope,
  ) {
    return this.agentsService.getAgentWidget(user, supabase, agentKey, scope)
  }

  @Patch(':agentKey/widget')
  async updateAgentWidget(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('agentKey') agentKey: string,
    @Body()
    body: {
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
    },
    @OrgContext() scope: RequestScope,
  ) {
    return this.agentsService.updateAgentWidget(user, supabase, agentKey, body, scope)
  }
}
