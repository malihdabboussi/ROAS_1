import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Response } from 'express'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
} from '@vibey/api-shared'
import type { RequestScope } from '@vibey/api-shared'
import { ListDriveFilesSchema } from '../dto/google-drive.dto'
import { GoogleDriveApiService } from '../services/google-drive-api.service'
import { buildGoogleDriveUploadResponse } from './google-drive-upload-response'

@Controller('integrations/google-drive')
export class GoogleDriveFilesController {
  constructor(private readonly api: GoogleDriveApiService) {}

  @Get('files')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listFiles(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Query() query: Record<string, string | undefined>,
  ) {
    const validation = ListDriveFilesSchema.safeParse(query)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    const files = await this.api.listFiles(supabase, user.id, validation.data, scope.orgId)
    return { success: true, ...files }
  }

  @Get('shared-drives')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listSharedDrives(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
  ) {
    const result = await this.api.listSharedDrives(supabase, user.id, scope.orgId)
    return { success: true, ...result }
  }

  @Get('files/:fileId')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getFile(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param('fileId') fileId: string,
  ) {
    const file = await this.api.getFile(supabase, user.id, fileId, scope.orgId)
    return { success: true, file }
  }

  @Get('files/:fileId/content')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getFileContent(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param('fileId') fileId: string,
    @Query('as') asFormat?: string,
  ) {
    if (asFormat && asFormat !== 'html') {
      throw new HttpException(
        { success: false, error: 'Only ?as=html is supported right now' },
        HttpStatus.BAD_REQUEST,
      )
    }

    const content = await this.api.getFileContent(supabase, user.id, fileId, scope.orgId)
    return { success: true, ...content }
  }

  @Get('files/:fileId/download')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async downloadFile(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ) {
    const file = await this.api.getFile(supabase, user.id, fileId, scope.orgId)
    const { buffer, exportMimeType, exportExt } = await this.api.downloadFile(
      supabase,
      user.id,
      fileId,
      file.mimeType,
      scope.orgId,
    )
    const filename =
      exportExt && !file.name.endsWith(exportExt) ? `${file.name}${exportExt}` : file.name
    const asciiName = filename.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '\\"')
    res.setHeader('Content-Type', exportMimeType)
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    )
    res.send(buffer)
  }

  @Post('files/upload')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async uploadFile(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body() body: { name: string; mimeType: string; content: string; folderId?: string },
  ) {
    const buffer = Buffer.from(body.content, 'base64')
    const file = await this.api.uploadFile(
      supabase,
      user.id,
      body.name,
      body.mimeType,
      buffer,
      body.folderId,
      scope.orgId,
    )
    return buildGoogleDriveUploadResponse(file, body, buffer.length, scope.orgId)
  }

  @Patch('files/:fileId/rename')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async renameFile(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param('fileId') fileId: string,
    @Body() body: { name: string },
  ) {
    const file = await this.api.renameFile(supabase, user.id, fileId, body.name, scope.orgId)
    return { success: true, file }
  }

  @Post('files/:fileId/share')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async shareFile(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param('fileId') fileId: string,
    @Body() body: { email: string; role?: 'reader' | 'writer' | 'commenter' },
  ) {
    await this.api.shareFile(
      supabase,
      user.id,
      fileId,
      body.email,
      body.role ?? 'reader',
      scope.orgId,
    )
    return { success: true }
  }

  @Delete('files/:fileId')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async deleteFile(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param('fileId') fileId: string,
  ) {
    await this.api.deleteFile(supabase, user.id, fileId, scope.orgId)
    return { success: true }
  }
}
