'use client'

import { backendDelete, backendGet, backendPost } from '@/lib/api/backend-client'

export interface DropboxFile {
  id: string
  name: string
  path_lower: string
  path_display: string
  '.tag': 'file' | 'folder' | 'deleted'
  size?: number
  is_downloadable?: boolean
  client_modified?: string
  server_modified?: string
}

export interface DropboxStatus {
  success: boolean
  connected: boolean
  status: string | null
  email: string | null
  displayName: string | null
  connectedAt: string | null
}

export async function getDropboxStatus(): Promise<DropboxStatus> {
  return backendGet<DropboxStatus>('/api/integrations/dropbox/status')
}

export async function listDropboxFiles(opts?: {
  path?: string
  cursor?: string
  limit?: number
}): Promise<{ success: boolean; entries: DropboxFile[]; cursor: string; has_more: boolean }> {
  const params = new URLSearchParams()
  if (opts?.path) params.set('path', opts.path)
  if (opts?.cursor) params.set('cursor', opts.cursor)
  if (opts?.limit) params.set('limit', String(opts.limit))
  const qs = params.toString()
  return backendGet<{
    success: boolean
    entries: DropboxFile[]
    cursor: string
    has_more: boolean
  }>(`/api/integrations/dropbox/files${qs ? `?${qs}` : ''}`)
}

export async function searchDropboxFiles(
  query: string,
  path?: string,
): Promise<{ success: boolean; matches: DropboxFile[] }> {
  const params = new URLSearchParams({ query })
  if (path) params.set('path', path)
  return backendGet<{ success: boolean; matches: DropboxFile[] }>(
    `/api/integrations/dropbox/search?${params.toString()}`,
  )
}

export async function uploadFileToDropbox(
  path: string,
  content: string,
  mode: 'add' | 'overwrite' = 'add',
): Promise<{ success: boolean; file: DropboxFile }> {
  return backendPost<{ success: boolean; file: DropboxFile }>(
    '/api/integrations/dropbox/files/upload',
    { path, content, mode },
  )
}

export async function deleteDropboxFile(path: string): Promise<void> {
  return backendDelete(`/api/integrations/dropbox/files?path=${encodeURIComponent(path)}`)
}

export async function shareDropboxFile(path: string): Promise<{ success: boolean; url: string }> {
  return backendPost<{ success: boolean; url: string }>('/api/integrations/dropbox/files/share', {
    path,
  })
}

export async function connectDropbox(
  redirectTo: string,
): Promise<{ success: boolean; authorizeUrl: string }> {
  return backendPost<{ success: boolean; authorizeUrl: string }>(
    '/api/integrations/dropbox/connect',
    { redirectTo },
  )
}

export async function disconnectDropbox(): Promise<void> {
  await backendPost('/api/integrations/dropbox/disconnect', {})
}
