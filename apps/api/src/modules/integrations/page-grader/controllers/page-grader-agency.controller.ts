import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
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
import {
  GetPageGraderAgencyClientSchema,
  ListPageGraderAgencyCampaignsSchema,
  ListPageGraderAgencyClientsSchema,
  ListPageGraderAgencyLaunchesSchema,
  PatchPageGraderWorkspaceEntitySchema,
} from '../dto/page-grader.dto'
import { PageGraderAgencyWorkspaceService } from '../services/page-grader-agency-workspace.service'

@Controller('integrations/page-grader/agency')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
export class PageGraderAgencyController {
  constructor(private readonly workspace: PageGraderAgencyWorkspaceService) {}

  @Get('clients')
  @RequireOrgRole('viewer')
  async listClients(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Query() query: Record<string, string | undefined>,
  ) {
    const validation = ListPageGraderAgencyClientsSchema.safeParse(query)
    if (!validation.success) invalidRequest(validation.error.flatten())
    return {
      success: true,
      ...(await this.workspace.listClients(supabase, user.id, scope, validation.data)),
    }
  }

  @Get('clients/:clientId')
  @RequireOrgRole('viewer')
  async getClient(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('clientId') clientId: string,
    @Query() query: Record<string, string | undefined>,
  ) {
    const validation = GetPageGraderAgencyClientSchema.safeParse(query)
    if (!validation.success) invalidRequest(validation.error.flatten())
    return {
      success: true,
      workspace: await this.workspace.getClient(supabase, user.id, scope, clientId, {
        sync: validation.data.sync,
      }),
    }
  }

  @Get('client-campaigns')
  @RequireOrgRole('viewer')
  async listCampaigns(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Query() query: Record<string, string | undefined>,
  ) {
    const validation = ListPageGraderAgencyCampaignsSchema.safeParse(query)
    if (!validation.success) invalidRequest(validation.error.flatten())
    return {
      success: true,
      ...(await this.workspace.listCampaigns(supabase, user.id, scope, {
        q: validation.data.q,
        clientId: validation.data.client_id,
        sync: validation.data.sync,
      })),
    }
  }

  @Get('launches')
  @RequireOrgRole('viewer')
  async listLaunches(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Query() query: Record<string, string | undefined>,
  ) {
    const validation = ListPageGraderAgencyLaunchesSchema.safeParse(query)
    if (!validation.success) invalidRequest(validation.error.flatten())
    return {
      success: true,
      ...(await this.workspace.listLaunches(supabase, user.id, scope, {
        q: validation.data.q,
        clientId: validation.data.client_id,
        kind: validation.data.kind,
        from: validation.data.from,
        to: validation.data.to,
        sync: validation.data.sync,
      })),
    }
  }

  @Post('clients/:clientId/update')
  @RequireOrgRole('editor')
  async patchEntity(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('clientId') clientId: string,
    @Body() body: unknown,
  ) {
    const validation = PatchPageGraderWorkspaceEntitySchema.safeParse(body)
    if (!validation.success) invalidRequest(validation.error.flatten())
    if (validation.data.kind !== 'client' && !validation.data.entity_id) {
      throw new HttpException(
        { success: false, error: 'entity_id is required for this update' },
        HttpStatus.BAD_REQUEST,
      )
    }
    return {
      success: true,
      result: await this.workspace.patchEntity(supabase, user.id, scope, {
        clientId,
        kind: validation.data.kind,
        entityId: validation.data.entity_id,
        patch: validation.data.patch,
      }),
    }
  }
}

function invalidRequest(details: unknown): never {
  throw new HttpException(
    { success: false, error: 'Invalid request', details },
    HttpStatus.BAD_REQUEST,
  )
}
