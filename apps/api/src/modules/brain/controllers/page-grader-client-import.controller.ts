import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  RequireOrgRole,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { BrainAuthGuard } from '../guards/brain-auth.guard'
import {
  PageGraderClientImportService,
  type PageGraderClientImportBody,
} from '../services/page-grader-client-import.service'

@Controller('brain/page-grader')
@UseGuards(BrainAuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class PageGraderClientImportController {
  constructor(private readonly service: PageGraderClientImportService) {}

  @Post('client-package')
  @HttpCode(HttpStatus.ACCEPTED)
  @RequireOrgRole('editor')
  async importClientPackage(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Body() body: PageGraderClientImportBody,
    @OrgContext() scope: RequestScope,
  ) {
    return this.service.importPackage(supabase, user.id, body, scope)
  }
}
