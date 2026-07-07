import { getActiveOrgIdFromStorage } from './org-storage'

export function withOrgParam(target: string, orgId: string | null): string {
  if (typeof window === 'undefined') return target

  if (!orgId) return target

  try {
    const url = new URL(target, window.location.origin)
    if (url.origin !== window.location.origin) return target
    url.searchParams.set('org', orgId)
    return target.startsWith('http://') || target.startsWith('https://')
      ? url.toString()
      : `${url.pathname}${url.search}${url.hash}`
  } catch {
    return target
  }
}

export function withActiveOrgParam(target: string): string {
  return withOrgParam(target, getActiveOrgIdFromStorage())
}

export function openInNewTab(target: string): Window | null {
  if (typeof window === 'undefined') return null
  return window.open(withActiveOrgParam(target), '_blank', 'noopener,noreferrer')
}
