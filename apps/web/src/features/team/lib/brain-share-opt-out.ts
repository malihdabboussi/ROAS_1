import { getOrgScopedKey } from '@/lib/utils/org-storage'

const STORAGE_KEY = 'vibey_manage_brain_share_opt_out'

export function getBrainShareOptOutKeys(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(getOrgScopedKey(STORAGE_KEY))
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return new Set()
    return new Set(arr.filter((x): x is string => typeof x === 'string'))
  } catch {
    return new Set()
  }
}

export function addBrainShareOptOut(agentKey: string): void {
  if (typeof window === 'undefined') return
  const s = getBrainShareOptOutKeys()
  s.add(agentKey)
  localStorage.setItem(getOrgScopedKey(STORAGE_KEY), JSON.stringify([...s]))
}

export function removeBrainShareOptOut(agentKey: string): void {
  if (typeof window === 'undefined') return
  const s = getBrainShareOptOutKeys()
  s.delete(agentKey)
  localStorage.setItem(getOrgScopedKey(STORAGE_KEY), JSON.stringify([...s]))
}
