import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
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
  ConnectPageGraderSchema,
  ListPageGraderClientsSchema,
  SendPageGraderWorkSchema,
} from '../dto/page-grader.dto'
import { PageGraderApiService } from '../services/page-grader-api.service'

@Controller('integrations/page-grader')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
export class PageGraderController {
  constructor(private readonly api: PageGraderApiService) {}

  @Get('status')
  @RequireOrgRole('viewer')
  async status(@CurrentUser() user: { id: string }) {
    const result = await this.api.getStatus(user.id)
    return { success: true, ...result }
  }

  @Post('connect')
  @RequireOrgRole('editor')
  async connect(@CurrentUser() user: { id: string }, @Body() body: unknown) {
    const validation = ConnectPageGraderSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    const result = await this.api.connect(
      user.id,
      validation.data.baseUrl,
      validation.data.apiKey,
    )
    return { success: true, ...result }
  }

  @Post('disconnect')
  @RequireOrgRole('editor')
  async disconnect(@CurrentUser() user: { id: string }) {
    await this.api.disconnect(user.id)
    return { success: true }
  }

  @Get('clients')
  @RequireOrgRole('viewer')
  async listClients(
    @CurrentUser() user: { id: string },
    @Query() query: Record<string, string | undefined>,
  ) {
    const validation = ListPageGraderClientsSchema.safeParse(query)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    const result = await this.api.listClients(user.id, validation.data)
    return { success: true, ...result }
  }

  @Post('send')
  @RequireOrgRole('editor')
  async send(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Body() body: unknown,
    @OrgContext() scope: RequestScope,
  ) {
    const validation = SendPageGraderWorkSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    const result = await this.api.sendWork(
      supabase,
      user.id,
      validation.data,
      scope.orgId,
      scope.orgRole,
    )
    return { success: result.success, results: result.results }
  }
}
