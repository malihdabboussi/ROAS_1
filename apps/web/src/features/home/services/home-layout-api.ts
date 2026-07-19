import { backendGet, backendPatch } from '@/lib/api/backend-client'
import type { HomeLayoutState } from '../types/home-cards'

type ProfilePreferencesResponse = {
  preferences?: Record<string, unknown> | null
}

export async function fetchHomeLayoutPreference(): Promise<unknown | null> {
  const profile = await backendGet<ProfilePreferencesResponse>('/api/profile')
  const preferences = profile.preferences
  if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) {
    return null
  }
  return 'home_layout' in preferences ? preferences.home_layout : null
}

export async function saveHomeLayoutPreference(layout: HomeLayoutState): Promise<void> {
  await backendPatch('/api/profile/preferences', { home_layout: layout })
}
