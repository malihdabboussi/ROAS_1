import type { VibeyPendingArtifactOpen } from './pending-artifact-open'
import { openInNewTab } from '@/lib/utils/open-in-new-tab'
import { getOrgScopedKey } from '@/lib/utils/org-storage'

const STORAGE_KEY_BASE = 'vibey-studio-open-artifact-bootstrap'

export interface StudioOpenArtifactBootstrap {
  campaignId: string
  campaignName?: string | null
  campaignIcon?: string | null
  pending: VibeyPendingArtifactOpen
}

/** Persists open payload for the new tab; Studio reads once from sessionStorage on mount. */
export function openStudioArtifactInNewTab(payload: StudioOpenArtifactBootstrap): void {
  const key = getOrgScopedKey(STORAGE_KEY_BASE)
  sessionStorage.setItem(key, JSON.stringify(payload))
  openInNewTab('/team')
}

export function readStudioOpenArtifactBootstrap(): StudioOpenArtifactBootstrap | null {
  const key = getOrgScopedKey(STORAGE_KEY_BASE)
  const raw = sessionStorage.getItem(key)
  if (!raw) return null
  sessionStorage.removeItem(key)
  try {
    const parsed = JSON.parse(raw) as StudioOpenArtifactBootstrap
    if (
      parsed &&
      typeof parsed.campaignId === 'string' &&
      parsed.campaignId &&
      parsed.pending &&
      typeof parsed.pending === 'object'
    ) {
      return parsed
    }
  } catch {
    /* empty */
  }
  return null
}
