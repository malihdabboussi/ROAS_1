'use client'

import { backendGet } from '@/lib/api/backend-client'

export type DriveFileContentKind = 'html' | 'csv' | 'pdf' | 'embed'

export type DriveFileContent = {
  kind: DriveFileContentKind
  mime_type: string
  modified_time: string
  content?: string
  web_view_link?: string
}

const TTL_MS = 5 * 60 * 1000
const contentCache = new Map<string, { value: DriveFileContent; expiresAt: number }>()

export function toDrivePreviewUrl(webViewLink?: string | null): string | null {
  if (!webViewLink) return null
  if (webViewLink.includes('/preview')) return webViewLink
  return webViewLink.replace('/view', '/preview')
}

export async function fetchDriveFileContent(
  driveFileId: string,
  modifiedTime?: string | null,
): Promise<DriveFileContent> {
  const cacheKey = `${driveFileId}:${modifiedTime ?? 'unknown'}`
  const now = Date.now()
  const cached = contentCache.get(cacheKey)
  if (cached && cached.expiresAt > now) {
    return cached.value
  }
  if (cached && cached.expiresAt <= now) {
    contentCache.delete(cacheKey)
  }

  const result = await backendGet<{ success?: boolean } & DriveFileContent>(
    `/api/integrations/google-drive/files/${driveFileId}/content?as=html`,
  )
  const payload: DriveFileContent = {
    kind: result.kind,
    mime_type: result.mime_type,
    modified_time: result.modified_time,
    content: result.content,
    web_view_link: result.web_view_link,
  }
  contentCache.set(cacheKey, { value: payload, expiresAt: now + TTL_MS })
  return payload
}

export function clearDriveFileContentCacheByFile(driveFileId: string): void {
  for (const key of contentCache.keys()) {
    if (key.startsWith(`${driveFileId}:`)) contentCache.delete(key)
  }
}

export function clearDriveFileContentCache(): void {
  contentCache.clear()
}
