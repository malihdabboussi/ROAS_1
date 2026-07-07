import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  RequireOrgRole,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { MissionsAgentOperationsService } from '../../missions/services/missions-agent-operations.service'

@Controller('agents')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class AgentConfigController {
  constructor(private readonly agentOperations: MissionsAgentOperationsService) {}

  @Patch(':agentKey/user-state')
  async updateAgentUserState(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('agentKey') agentKey: string,
    @OrgContext() scope: RequestScope,
    @Body() body: { is_favorite?: boolean },
  ) {
    return this.agentOperations.upsertAgentUserState(supabase, user.id, agentKey, scope.orgId, body)
  }

  @Patch(':agentKey/name')
  async renameAgent(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('agentKey') agentKey: string,
    @Body() body: { name: string },
    @OrgContext() scope: RequestScope,
  ) {
    return this.agentOperations.renameAgent(supabase, user.id, agentKey, body.name, scope.orgId)
  }

  @Patch(':agentKey/active')
  async updateAgentActive(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('agentKey') agentKey: string,
    @Body() body: { active: boolean },
    @OrgContext() scope: RequestScope,
  ) {
    return this.agentOperations.updateAgentActive(
      supabase,
      user.id,
      agentKey,
      body.active === true,
      scope.orgId,
    )
  }

  @Post(':agentKey/repair-setup')
  @HttpCode(HttpStatus.OK)
  async repairAgentSetup(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('agentKey') agentKey: string,
    @OrgContext() scope: RequestScope,
  ) {
    return this.agentOperations.repairAgentSetup(supabase, user.id, agentKey, scope.orgId)
  }

  @Patch(':agentKey/image')
  async updateAgentImage(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('agentKey') agentKey: string,
    @Body() body: { image_url: string },
    @OrgContext() scope: RequestScope,
  ) {
    return this.agentOperations.updateAgentImage(
      supabase,
      user.id,
      agentKey,
      body.image_url,
      scope.orgId,
    )
  }

  @Patch(':agentKey/communication')
  async updateAgentCommunication(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('agentKey') agentKey: string,
    @Body()
    body: {
      model_id?: string | null
      model_settings?: Record<string, unknown> | null
      voice_name?: string | null
      communication_style?: string | null
    },
    @OrgContext() scope: RequestScope,
  ) {
    if (body.voice_name !== undefined) {
      await this.agentOperations.updateAgentVoiceName(
        supabase,
        user.id,
        agentKey,
        body.voice_name,
        scope.orgId,
      )
    }
    const configPatch: Record<string, unknown> = {}
    if (body.model_id !== undefined) configPatch.model_id = body.model_id
    if (body.model_settings !== undefined) configPatch.model_settings = body.model_settings
    if (body.communication_style !== undefined) {
      configPatch.communication_style = body.communication_style
    }
    if (Object.keys(configPatch).length > 0) {
      return this.agentOperations.patchAgentConfig(
        supabase,
        user.id,
        agentKey,
        configPatch,
        scope.orgId,
      )
    }
    return { ok: true }
  }

  @Patch(':agentKey/onboarding-complete')
  async markOnboardingComplete(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('agentKey') agentKey: string,
    @OrgContext() scope: RequestScope,
  ) {
    return this.agentOperations.patchAgentConfig(
      supabase,
      user.id,
      agentKey,
      { needs_onboarding_chat: false },
      scope.orgId,
    )
  }

  @Delete(':agentKey')
  @RequireOrgRole('admin')
  async fireEmployee(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('agentKey') agentKey: string,
    @OrgContext() scope: RequestScope,
    @Body() body?: { handoff?: unknown },
  ) {
    return this.agentOperations.fireEmployee(supabase, user.id, agentKey, scope.orgId, {
      handoff: (body?.handoff as never) ?? null,
    })
  }
}
