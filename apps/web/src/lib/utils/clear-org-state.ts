import { useBrainStore } from '@/features/brain/store/use-brain-store'
import { cancelAllPendingBackendRequests } from '@/lib/api/backend-client'
import { invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'

const ORG_SENSITIVE_LOCALSTORAGE_KEYS = [
  'vibey-campaigns-cache',
  'vibey-campaign-mode',
  'vibey-web-chat-store',
  'team-agent-last-session',
  'vibey_manage_brain_share_opt_out',
  'vibey-brain-positions',
  'crm-contacts-filters',
  'crm-contacts-columns',
  'leads-tab-columns',
  'vibey-bulk-creator',
]

function removeOrgSensitiveKeys(storage: Storage): void {
  for (const key of ORG_SENSITIVE_LOCALSTORAGE_KEYS) {
    storage.removeItem(key)
    for (let i = storage.length - 1; i >= 0; i -= 1) {
      const existingKey = storage.key(i)
      if (existingKey?.startsWith(`${key}:`)) {
        storage.removeItem(existingKey)
      }
    }
  }
}

export function clearOrgSensitiveState(): void {
  try {
    cancelAllPendingBackendRequests()
  } catch {}

  try {
    removeOrgSensitiveKeys(localStorage)
  } catch {}

  try {
    removeOrgSensitiveKeys(sessionStorage)
  } catch {}

  try {
    useBrainStore.getState().reset?.()
  } catch {}

  try {
    // These API lists are org-scoped — drop cached rows so a context switch
    // without a hard reload can't serve the previous org's data.
    invalidateCachedFetch('agents:list')
    invalidateCachedFetch('campaigns:list')
    invalidateCachedFetch('campaigns:user-state')
  } catch {}
}

export function navigateHomeAfterOrgSwitch(): void {
  setTimeout(() => {
    window.location.href = '/home'
  }, 50)
}
