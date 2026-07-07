'use client'

import { backendDelete, backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'

export type DriveMappingSyncStatus = 'idle' | 'syncing' | 'error'

export type DriveMappingSource = 'my_drive' | 'shared_with_me' | 'shared_drives'

export type DriveFolderMapping = {
  id: string
  space_id: string
  org_id: string
  user_id: string
  provider: 'google_drive'
  drive_folder_id: string
  drive_id: string | null
  drive_folder_name: string
  source: DriveMappingSource
  root_space_item_id: string | null
  enabled: boolean
  sync_status: DriveMappingSyncStatus
  last_synced_at: string | null
  last_sync_error: string | null
  next_sync_at: string | null
  sync_interval_seconds: number
  created_at: string
  updated_at: string
}

export async function listDriveFolderMappings(spaceId: string): Promise<DriveFolderMapping[]> {
  const result = await backendGet<{ success: boolean; mappings: DriveFolderMapping[] }>(
    `/api/spaces/${spaceId}/drive-mappings`,
  )
  return result.mappings ?? []
}

export async function createDriveFolderMapping(
  spaceId: string,
  input: {
    drive_folder_id: string
    drive_folder_name: string
    drive_id?: string
    source?: DriveMappingSource
  },
): Promise<DriveFolderMapping> {
  const result = await backendPost<{
    success: boolean
    mapping: DriveFolderMapping
  }>(`/api/spaces/${spaceId}/drive-mappings`, input)
  return result.mapping
}

export async function updateDriveFolderMapping(
  spaceId: string,
  mappingId: string,
  input: { enabled?: boolean; sync_interval_seconds?: number },
): Promise<DriveFolderMapping> {
  const result = await backendPatch<{
    success: boolean
    mapping: DriveFolderMapping
  }>(`/api/spaces/${spaceId}/drive-mappings/${mappingId}`, input)
  return result.mapping
}

export async function deleteDriveFolderMapping(
  spaceId: string,
  mappingId: string,
  deleteSyncedItems = true,
): Promise<void> {
  await backendDelete(`/api/spaces/${spaceId}/drive-mappings/${mappingId}`, {
    delete_synced_items: deleteSyncedItems,
  })
}

export async function syncDriveFolderMappingNow(spaceId: string, mappingId: string): Promise<void> {
  await backendPost(`/api/spaces/${spaceId}/drive-mappings/${mappingId}/sync-now`, {})
}
