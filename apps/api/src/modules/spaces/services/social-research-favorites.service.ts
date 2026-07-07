import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  SocialResearchFavoritesRepository,
  type FavoriteFolder,
} from '../repositories/social-research-favorites.repository'

/**
 * Favorite folders for research views. Folders are identity-only — which
 * posts belong to a folder lives on each item's
 * custom_data.favorite_folder_ids, so contents/counts derive from items the
 * client already has.
 */
@Injectable()
export class SocialResearchFavoritesService {
  constructor(
    private readonly favoritesRepo: SocialResearchFavoritesRepository = new SocialResearchFavoritesRepository(),
  ) {}

  async listFolders(opts: {
    supabase: SupabaseClient
    spaceId: string
  }): Promise<FavoriteFolder[]> {
    return this.favoritesRepo.listFolders(opts.supabase, opts.spaceId)
  }

  async createFolder(opts: {
    supabase: SupabaseClient
    userId: string
    orgId: string | null
    spaceId: string
    name: string
  }): Promise<FavoriteFolder> {
    const name = opts.name.trim()
    if (!name) throw new BadRequestException('Folder name is required')
    return this.favoritesRepo.createFolder(opts.supabase, {
      user_id: opts.userId,
      org_id: opts.orgId,
      space_id: opts.spaceId,
      name,
    })
  }

  async renameFolder(opts: {
    supabase: SupabaseClient
    spaceId: string
    folderId: string
    name: string
  }): Promise<void> {
    const name = opts.name.trim()
    if (!name) throw new BadRequestException('Folder name is required')
    await this.favoritesRepo.renameFolder(opts.supabase, opts.spaceId, opts.folderId, name)
  }

  async deleteFolder(opts: {
    supabase: SupabaseClient
    spaceId: string
    folderId: string
  }): Promise<void> {
    await this.favoritesRepo.deleteFolder(opts.supabase, opts.spaceId, opts.folderId)
    // Dangling folder ids left on items are harmless — the client intersects
    // memberships with the live folder list.
  }
}
