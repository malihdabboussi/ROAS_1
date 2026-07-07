/**
 * Favorite folders client. Folders are identity rows; which posts belong to a
 * folder lives on each item's custom_data.favorite_folder_ids, updated via the
 * normal item PATCH (custom_data merges server-side).
 */
import { backendDelete, backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'
import { cachedFetch, invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'

export interface FavoriteFolder {
  id: string
  name: string
  created_at: string
}

function foldersPath(spaceId: string, suffix = ''): string {
  return `/api/spaces/${spaceId}/social-research/favorite-folders${suffix}`
}

function foldersCacheKey(spaceId: string): string {
  return `favorite-folders:${spaceId}`
}

export async function listFavoriteFolders(spaceId: string): Promise<FavoriteFolder[]> {
  const res = await cachedFetch(
    foldersCacheKey(spaceId),
    () => backendGet<{ success: boolean; folders: FavoriteFolder[] }>(foldersPath(spaceId)),
    { ttlMs: 60_000 },
  )
  return res.folders
}

export async function createFavoriteFolder(spaceId: string, name: string): Promise<FavoriteFolder> {
  const res = await backendPost<{ success: boolean; folder: FavoriteFolder }>(
    foldersPath(spaceId),
    { name },
  )
  invalidateCachedFetch(foldersCacheKey(spaceId))
  return res.folder
}

export async function renameFavoriteFolder(
  spaceId: string,
  folderId: string,
  name: string,
): Promise<void> {
  await backendPatch<{ success: boolean }>(foldersPath(spaceId, `/${folderId}`), { name })
  invalidateCachedFetch(foldersCacheKey(spaceId))
}

export async function deleteFavoriteFolder(spaceId: string, folderId: string): Promise<void> {
  await backendDelete<{ success: boolean }>(foldersPath(spaceId, `/${folderId}`))
  invalidateCachedFetch(foldersCacheKey(spaceId))
}

/** Folder ids an item belongs to, read from its custom_data. */
export function favoriteFolderIdsOf(
  customData: Record<string, unknown> | null | undefined,
): string[] {
  const ids = customData?.favorite_folder_ids
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []
}
