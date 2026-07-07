export const IMPERSONATION_STORAGE_KEY = 'vibey-impersonation'

export type ImpersonationTargetStorage = {
  userId: string
  email: string | null
  name: string | null
}

export function getImpersonationFromStorage(): ImpersonationTargetStorage | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(IMPERSONATION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ImpersonationTargetStorage | null
    return typeof parsed?.userId === 'string' && parsed.userId.length > 0 ? parsed : null
  } catch {
    return null
  }
}

export function getImpersonatedUserIdFromStorage(): string | null {
  return getImpersonationFromStorage()?.userId ?? null
}

export function setImpersonationStorage(target: ImpersonationTargetStorage): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(IMPERSONATION_STORAGE_KEY, JSON.stringify(target))
}

export function clearImpersonationStorage(): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY)
}
