import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
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
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import {
  CalendarIdentityIdParamSchema,
  ConnectGoogleWorkspaceSchema,
  CreateCalendarIdentitySchema,
  LinkCalendarIdentitySchema,
  PersonAgendaQuerySchema,
  type CalendarIdentityIdParam,
  type ConnectGoogleWorkspaceDto,
  type CreateCalendarIdentityDto,
  type LinkCalendarIdentityDto,
  type PersonAgendaQuery,
} from '../dto/google-workspace.dto'
import { GoogleWorkspaceApiService } from '../services/google-workspace-api.service'
import { GoogleWorkspaceCalendarService } from '../services/google-workspace-calendar.service'
import { GoogleWorkspacePersonBriefingService } from '../services/google-workspace-person-briefing.service'
import { OrgPersonCalendarIdentitiesService } from '../services/org-person-calendar-identities.service'

@Controller('integrations/google-workspace')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class GoogleWorkspaceController {
  constructor(
    private readonly api: GoogleWorkspaceApiService,
    private readonly identities: OrgPersonCalendarIdentitiesService,
    private readonly calendar: GoogleWorkspaceCalendarService,
    private readonly briefing: GoogleWorkspacePersonBriefingService,
  ) {}

  private assertAdminOrAgent(scope: RequestScope, internalToken?: string) {
    const isAgentPath =
      Boolean(internalToken) &&
      Boolean(process.env.INTERNAL_API_TOKEN) &&
      internalToken === process.env.INTERNAL_API_TOKEN
    if (isAgentPath && scope.orgId) return
    if (scope.orgRole === 'admin' || scope.orgRole === 'owner') return
    throw new ForbiddenException('Only org admins or agents can access Workspace calendars')
  }

  @Get('status')
  @RequireOrgRole('viewer')
  async status(@OrgContext() scope: RequestScope) {
    return { success: true, ...(await this.api.getStatus(scope.orgId)) }
  }

  @Post('connect')
  @RequireOrgRole('admin')
  async connect(
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body(new ZodValidationPipe(ConnectGoogleWorkspaceSchema)) body: ConnectGoogleWorkspaceDto,
  ) {
    const result = await this.api.connect(user.id, scope, {
      serviceAccountJson: body.service_account_json,
      workspaceAdminEmail: body.workspace_admin_email,
    })
    return { success: true, ...result }
  }

  @Post('disconnect')
  @RequireOrgRole('admin')
  async disconnect(@CurrentUser() user: { id: string }, @OrgContext() scope: RequestScope) {
    const result = await this.api.disconnect(user.id, scope)
    return { success: true, ...result }
  }

  @Post('sync-directory')
  @RequireOrgRole('admin')
  async syncDirectory(@Supabase() supabase: SupabaseClient, @OrgContext() scope: RequestScope) {
    return this.api.syncDirectory(supabase, scope)
  }

  @Get('identities')
  @RequireOrgRole('admin')
  async listIdentities(@Supabase() supabase: SupabaseClient, @OrgContext() scope: RequestScope) {
    const identities = await this.identities.list(supabase, scope.orgId!)
    return { success: true, identities }
  }

  @Post('identities')
  @RequireOrgRole('admin')
  async createIdentity(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Body(new ZodValidationPipe(CreateCalendarIdentitySchema)) body: CreateCalendarIdentityDto,
  ) {
    const identity = await this.identities.createManual(supabase, scope.orgId!, body)
    return { success: true, identity }
  }

  @Post('identities/seed-from-org')
  @RequireOrgRole('admin')
  async seedIdentities(@Supabase() supabase: SupabaseClient, @OrgContext() scope: RequestScope) {
    return this.identities.seedFromOrgSurfaces(supabase, scope.orgId!)
  }

  @Post('identities/:id/confirm')
  @RequireOrgRole('admin')
  async confirmIdentity(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(CalendarIdentityIdParamSchema)) params: CalendarIdentityIdParam,
  ) {
    const identity = await this.identities.confirm(supabase, scope.orgId!, params.id)
    return { success: true, identity }
  }

  @Post('identities/:id/reject')
  @RequireOrgRole('admin')
  async rejectIdentity(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(CalendarIdentityIdParamSchema)) params: CalendarIdentityIdParam,
  ) {
    const identity = await this.identities.reject(supabase, scope.orgId!, params.id)
    return { success: true, identity }
  }

  @Patch('identities/:id')
  @RequireOrgRole('admin')
  async linkIdentity(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(CalendarIdentityIdParamSchema)) params: CalendarIdentityIdParam,
    @Body(new ZodValidationPipe(LinkCalendarIdentitySchema)) body: LinkCalendarIdentityDto,
  ) {
    const identity = await this.identities.linkManual(supabase, scope.orgId!, params.id, body)
    return { success: true, identity }
  }

  @Get('agenda')
  @RequireOrgRole('viewer')
  async personAgenda(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Headers('x-internal-token') internalToken: string | undefined,
    @Query(new ZodValidationPipe(PersonAgendaQuerySchema)) query: PersonAgendaQuery,
  ) {
    this.assertAdminOrAgent(scope, internalToken)
    return this.calendar.getPersonAgenda(supabase, scope, query)
  }

  @Get('org-upcoming')
  @RequireOrgRole('viewer')
  async orgUpcoming(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Headers('x-internal-token') internalToken: string | undefined,
    @Query(new ZodValidationPipe(PersonAgendaQuerySchema)) query: PersonAgendaQuery,
  ) {
    this.assertAdminOrAgent(scope, internalToken)
    return this.calendar.listOrgUpcoming(supabase, scope, query)
  }

  @Get('person-briefing')
  @RequireOrgRole('viewer')
  async personBriefing(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Headers('x-internal-token') internalToken: string | undefined,
    @Query(new ZodValidationPipe(PersonAgendaQuerySchema)) query: PersonAgendaQuery,
  ) {
    this.assertAdminOrAgent(scope, internalToken)
    return this.briefing.getPersonBriefing(supabase, user, scope, query)
  }
}
