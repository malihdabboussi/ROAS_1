import { Body, Controller, HttpException, HttpStatus, Post, UseGuards } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
} from '@vibey/api-shared'
import type { RequestScope } from '@vibey/api-shared'
import { CreateGoogleDocSchema } from '../dto/google-drive.dto'
import { GoogleDriveApiService } from '../services/google-drive-api.service'

@Controller('integrations/google-drive')
export class GoogleDriveDocumentExportController {
  constructor(private readonly api: GoogleDriveApiService) {}

  @Post('files/google-doc')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async createGoogleDoc(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body() body: unknown,
  ) {
    const validation = CreateGoogleDocSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    const file = await this.api.createGoogleDoc(
      supabase,
      user.id,
      validation.data.title,
      validation.data.html,
      scope.orgId,
    )
    return { success: true, file }
  }
}
