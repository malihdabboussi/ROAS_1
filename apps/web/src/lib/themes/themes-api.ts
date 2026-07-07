import { backendGet } from '@/lib/api/backend-client'
import type { Theme } from './theme-types'

export async function getTheme(themeId: string): Promise<Theme> {
  const data = await backendGet<{ theme: Theme }>(`/themes/${themeId}`)
  return data.theme
}
