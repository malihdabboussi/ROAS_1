import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Response } from 'express'
import {
  AuthGuard,
  buildExternalAssetRef,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
} from '@vibey/api-shared'
import type { RequestScope } from '@vibey/api-shared'
import { ListDropboxFilesSchema, StartDropboxConnectSchema } from '../dto/dropbox.dto'
import { DropboxApiService } from '../services/dropbox-api.service'
import { DropboxOAuthService } from '../services/dropbox-oauth.service'

@Controller('integrations/dropbox')
export class DropboxController {
  constructor(
    private readonly oauth: DropboxOAuthService,
    private readonly api: DropboxApiService,
  ) {}

  @Get('status')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async status(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
  ) {
    const result = await this.oauth.getStatus(supabase, user.id, scope.orgId)
    return { success: true, ...result }
  }

  @Post('connect')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async connect(@CurrentUser() user: { id: string }, @Body() body: unknown) {
    const validation = StartDropboxConnectSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    const authorizeUrl = this.oauth.getAuthorizationUrl(user.id, validation.data.redirectTo)
    return { success: true, authorizeUrl }
  }

  @Get('callback')
  async callback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    if (!code || !state) return res.status(HttpStatus.BAD_REQUEST).send('Missing code or state')
    try {
      const redirectTo = await this.oauth.handleCallback(code, state)
      return res.redirect(redirectTo)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Dropbox OAuth failed'
      return res.status(HttpStatus.BAD_REQUEST).send(msg)
    }
  }

  @Post('disconnect')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async disconnect(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
  ) {
    await this.oauth.disconnect(supabase, user.id, scope.orgId)
    return { success: true }
  }

  @Get('files')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listFiles(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Query() query: Record<string, string | undefined>,
  ) {
    const validation = ListDropboxFilesSchema.safeParse(query)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    const files = await this.api.listFiles(supabase, user.id, validation.data)
    return { success: true, ...files }
  }

  @Get('search')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async searchFiles(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Query('query') searchQuery: string,
    @Query('path') path?: string,
  ) {
    if (!searchQuery) {
      throw new HttpException(
        { success: false, error: 'query is required' },
        HttpStatus.BAD_REQUEST,
      )
    }
    const result = await this.api.searchFiles(supabase, user.id, searchQuery, { path })
    return { success: true, ...result }
  }

  @Get('files/download')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async downloadFile(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Query('path') path: string,
    @Res() res: Response,
  ) {
    if (!path)
      throw new HttpException({ success: false, error: 'path is required' }, HttpStatus.BAD_REQUEST)
    const buffer = await this.api.downloadFile(supabase, user.id, path)
    const fileName = path.split('/').pop() || 'download'
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    res.setHeader('Content-Type', 'application/octet-stream')
    res.send(buffer)
  }

  @Post('files/upload')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async uploadFile(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body() body: { path: string; content: string; mode?: 'add' | 'overwrite' },
    @OrgContext() scope?: RequestScope,
  ) {
    const buffer = Buffer.from(body.content, 'base64')
    const file = await this.api.uploadFile(supabase, user.id, body.path, buffer, body.mode ?? 'add')
    return {
      success: true,
      file,
      asset_ref: buildExternalAssetRef({
        provider: 'dropbox',
        external_id: file.id,
        file_path: file.path_display ?? file.path_lower ?? body.path,
        mime_type: 'application/octet-stream',
        name: file.name,
        original_filename: file.name,
        file_size: file.size ?? buffer.length,
        org_id: scope?.orgId ?? null,
        source: 'dropbox',
        source_surface: 'dropbox',
      }),
    }
  }

  @Delete('files')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async deleteFile(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Query('path') path: string,
  ) {
    if (!path)
      throw new HttpException({ success: false, error: 'path is required' }, HttpStatus.BAD_REQUEST)
    await this.api.deleteFile(supabase, user.id, path)
    return { success: true }
  }

  @Post('files/share')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async shareFile(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body() body: { path: string },
  ) {
    const result = await this.api.createSharedLink(supabase, user.id, body.path)
    return { success: true, ...result }
  }
}
