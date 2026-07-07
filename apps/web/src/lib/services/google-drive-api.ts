'use client'

import { backendDelete, backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'

export interface GoogleDriveFileOwner {
  displayName?: string
  emailAddress?: string
  photoLink?: string
}

export interface GoogleDriveFile {
  id: string
  name: string
  mimeType: string
  size?: string
  createdTime?: string
  modifiedTime?: string
  webViewLink?: string
  iconLink?: string
  thumbnailLink?: string
  parents?: string[]
  owners?: GoogleDriveFileOwner[]
  sharingUser?: GoogleDriveFileOwner
  starred?: boolean
}

export interface GoogleDriveStatus {
  success: boolean
  connected: boolean
  status: string | null
  email: string | null
  displayName: string | null
  connectedAt: string | null
}

export async function getGoogleDriveStatus(): Promise<GoogleDriveStatus> {
  return backendGet<GoogleDriveStatus>('/api/integrations/google-drive/status')
}

export async function listDriveFiles(opts?: {
  folderId?: string
  pageToken?: string
  pageSize?: number
  query?: string
  source?: 'my_drive' | 'shared_with_me' | 'shared_drives'
  driveId?: string
}): Promise<{ success: boolean; files: GoogleDriveFile[]; nextPageToken?: string }> {
  const params = new URLSearchParams()
  if (opts?.folderId) params.set('folderId', opts.folderId)
  if (opts?.pageToken) params.set('pageToken', opts.pageToken)
  if (opts?.pageSize) params.set('pageSize', String(opts.pageSize))
  if (opts?.query) params.set('query', opts.query)
  if (opts?.source) params.set('source', opts.source)
  if (opts?.driveId) params.set('driveId', opts.driveId)
  const qs = params.toString()
  return backendGet<{ success: boolean; files: GoogleDriveFile[]; nextPageToken?: string }>(
    `/api/integrations/google-drive/files${qs ? `?${qs}` : ''}`,
  )
}

export async function listSharedDrives(): Promise<{
  success: boolean
  drives: { id: string; name: string }[]
}> {
  return backendGet<{ success: boolean; drives: { id: string; name: string }[] }>(
    '/api/integrations/google-drive/shared-drives',
  )
}

export async function getDriveFile(
  fileId: string,
): Promise<{ success: boolean; file: GoogleDriveFile }> {
  return backendGet<{ success: boolean; file: GoogleDriveFile }>(
    `/api/integrations/google-drive/files/${fileId}`,
  )
}

export async function uploadFileToDrive(
  name: string,
  mimeType: string,
  content: string,
  folderId?: string,
): Promise<{ success: boolean; file: GoogleDriveFile }> {
  return backendPost<{ success: boolean; file: GoogleDriveFile }>(
    '/api/integrations/google-drive/files/upload',
    { name, mimeType, content, folderId },
  )
}

export async function renameDriveFile(
  fileId: string,
  name: string,
): Promise<{ success: boolean; file: GoogleDriveFile }> {
  return backendPatch<{ success: boolean; file: GoogleDriveFile }>(
    `/api/integrations/google-drive/files/${fileId}/rename`,
    { name },
  )
}

export async function shareDriveFile(
  fileId: string,
  email: string,
  role: 'reader' | 'writer' | 'commenter' = 'reader',
): Promise<void> {
  await backendPost('/api/integrations/google-drive/files/' + fileId + '/share', { email, role })
}

export async function deleteDriveFile(fileId: string): Promise<void> {
  return backendDelete(`/api/integrations/google-drive/files/${fileId}`)
}

export async function connectGoogleDrive(
  redirectTo: string,
): Promise<{ success: boolean; authorizeUrl: string }> {
  return backendPost<{ success: boolean; authorizeUrl: string }>(
    '/api/integrations/google-drive/connect',
    { redirectTo },
  )
}

export async function disconnectGoogleDrive(): Promise<void> {
  await backendPost('/api/integrations/google-drive/disconnect', {})
}
