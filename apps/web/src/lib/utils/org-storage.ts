export const ACTIVE_ORG_STORAGE_KEY = 'vibey-active-org'

type ActiveOrgStoragePayload = {
  state?: {
    activeOrgId?: unknown
  }
}

function getActiveOrgStorageValue(): string | null {
  if (typeof window === 'undefined') return null
  return window.sessionStorage.getItem(ACTIVE_ORG_STORAGE_KEY)
}

export function getActiveOrgIdFromStorage(): string | null {
  try {
    const raw = getActiveOrgStorageValue()
    if (!raw) return null
    const parsed = JSON.parse(raw) as ActiveOrgStoragePayload | null
    return typeof parsed?.state?.activeOrgId === 'string' ? parsed.state.activeOrgId : null
  } catch {
    return null
  }
}

export function clearActiveOrgStorage(): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(ACTIVE_ORG_STORAGE_KEY)
  window.localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY)
}

export function getOrgScopedKey(baseKey: string): string {
  const orgId = getActiveOrgIdFromStorage()
  return orgId ? `${baseKey}:${orgId}` : baseKey
}

export const activeOrgSessionStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') return null
    return window.sessionStorage.getItem(name)
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(name, value)
    window.localStorage.removeItem(name)
  },
  removeItem: (name: string): void => {
    if (typeof window === 'undefined') return
    window.sessionStorage.removeItem(name)
    window.localStorage.removeItem(name)
  },
}
