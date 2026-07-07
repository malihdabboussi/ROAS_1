import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface FavoriteFolder {
  id: string
  name: string
  created_at: string
}

const FOLDER_SELECT = 'id, name, created_at'

@Injectable()
export class SocialResearchFavoritesRepository {
  async listFolders(supabase: SupabaseClient, spaceId: string): Promise<FavoriteFolder[]> {
    const { data, error } = await supabase
      .from('space_favorite_folders')
      .select(FOLDER_SELECT)
      .eq('space_id', spaceId)
      .order('created_at', { ascending: true })
    if (error) throw new BadRequestException(`Failed to list favorite folders: ${error.message}`)
    return (data ?? []) as FavoriteFolder[]
  }

  async createFolder(
    supabase: SupabaseClient,
    payload: { user_id: string; org_id: string | null; space_id: string; name: string },
  ): Promise<FavoriteFolder> {
    const { data, error } = await supabase
      .from('space_favorite_folders')
      .insert(payload)
      .select(FOLDER_SELECT)
      .single()
    if (error) throw new BadRequestException(`Failed to create folder: ${error.message}`)
    return data as FavoriteFolder
  }

  async renameFolder(
    supabase: SupabaseClient,
    spaceId: string,
    folderId: string,
    name: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('space_favorite_folders')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('space_id', spaceId)
      .eq('id', folderId)
    if (error) throw new BadRequestException(`Failed to rename folder: ${error.message}`)
  }

  async deleteFolder(
    supabase: SupabaseClient,
    spaceId: string,
    folderId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('space_favorite_folders')
      .delete()
      .eq('space_id', spaceId)
      .eq('id', folderId)
    if (error) throw new BadRequestException(`Failed to delete folder: ${error.message}`)
  }
}
