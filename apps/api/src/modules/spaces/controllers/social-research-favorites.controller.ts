import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common'
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
import { SpaceIdParamSchema, type SpaceIdParam } from '../dto'
import { SocialResearchFavoritesService } from '../services/social-research-favorites.service'

@Controller('spaces/:id/social-research')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class SocialResearchFavoritesController {
  constructor(private readonly favorites: SocialResearchFavoritesService) {}

  @Get('favorite-folders')
  async listFavoriteFolders(@Supabase() supabase: SupabaseClient, @Param() params: SpaceIdParam) {
    const spaceId = SpaceIdParamSchema.parse({ id: params.id }).id
    const folders = await this.favorites.listFolders({ supabase, spaceId })
    return { success: true, folders }
  }

  @Post('favorite-folders')
  @HttpCode(HttpStatus.OK)
  async createFavoriteFolder(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param() params: SpaceIdParam,
    @Body() body: { name?: string },
  ) {
    const spaceId = SpaceIdParamSchema.parse({ id: params.id }).id
    const folder = await this.favorites.createFolder({
      supabase,
      userId: user.id,
      orgId: scope.orgId ?? null,
      spaceId,
      name: String(body?.name ?? ''),
    })
    return { success: true, folder }
  }

  @Patch('favorite-folders/:folderId')
  async renameFavoriteFolder(
    @Supabase() supabase: SupabaseClient,
    @Param() params: SpaceIdParam & { folderId: string },
    @Body() body: { name?: string },
  ) {
    const spaceId = SpaceIdParamSchema.parse({ id: params.id }).id
    await this.favorites.renameFolder({
      supabase,
      spaceId,
      folderId: params.folderId,
      name: String(body?.name ?? ''),
    })
    return { success: true }
  }

  @Delete('favorite-folders/:folderId')
  @HttpCode(HttpStatus.OK)
  async deleteFavoriteFolder(
    @Supabase() supabase: SupabaseClient,
    @Param() params: SpaceIdParam & { folderId: string },
  ) {
    const spaceId = SpaceIdParamSchema.parse({ id: params.id }).id
    await this.favorites.deleteFolder({ supabase, spaceId, folderId: params.folderId })
    return { success: true }
  }
}
