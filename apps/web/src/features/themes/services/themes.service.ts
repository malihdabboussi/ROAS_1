/**
 * Themes Service - Frontend API client
 * Calls NestJS backend through the proxy for theme CRUD operations
 */

import { backendDelete, backendGet, backendPost } from '@/lib/api/backend-client'
import type { Theme } from '../types'

// backendPut is not in the client yet, use backendPatch-style with PUT method
async function backendPut<T>(path: string, body: unknown): Promise<T> {
  const { backendFetch } = await import('@/lib/api/backend-client')
  const res = await backendFetch(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Backend error ${res.status}`)
  return res.json() as Promise<T>
}

export async function listThemes(): Promise<Theme[]> {
  const data = await backendGet<{ themes: Theme[] }>('/themes')
  return data.themes || []
}

export async function getTheme(themeId: string): Promise<Theme> {
  const data = await backendGet<{ theme: Theme }>(`/themes/${themeId}`)
  return data.theme
}

export async function createTheme(body: {
  name: string
  colors: Record<string, string>
  status?: 'draft' | 'complete'
  logo_asset_id?: string | null
}): Promise<Theme> {
  const data = await backendPost<{ theme: Theme }>('/themes', body)
  return data.theme
}

export async function updateTheme(themeId: string, body: Record<string, unknown>): Promise<Theme> {
  const data = await backendPut<{ theme: Theme }>(`/themes/${themeId}`, body)
  return data.theme
}

export async function deleteTheme(themeId: string): Promise<void> {
  await backendDelete(`/themes/${themeId}`)
}

export async function getThemeUsage(themeId: string): Promise<number> {
  const data = await backendGet<{ count: number }>(`/themes/${themeId}/usage`)
  return data.count
}
