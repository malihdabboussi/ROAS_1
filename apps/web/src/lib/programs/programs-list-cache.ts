import { cachedFetch, invalidateCachedFetch, peekCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { fetchPrograms, type Program } from './programs-api'

const PROGRAMS_CACHE_TTL_MS = 60_000

export function programsListCacheKey(orgId: string | null): string {
  return `programs:list:${orgId ?? 'personal'}`
}

function programsLocalStorageKey(orgId: string | null): string {
  return orgId ? `vibey-programs-cache:${orgId}` : 'vibey-programs-cache'
}

export function readProgramsLocalCache(orgId: string | null): Program[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(programsLocalStorageKey(orgId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Program[]
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function writeProgramsLocalCache(orgId: string | null, programs: Program[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(programsLocalStorageKey(orgId), JSON.stringify(programs))
  } catch {
    /* empty */
  }
}

export function peekProgramsMemoryCache(orgId: string | null): Program[] | undefined {
  return peekCachedFetch<Program[]>(programsListCacheKey(orgId))
}

export function loadProgramsCached(orgId: string | null): Promise<Program[]> {
  return cachedFetch(programsListCacheKey(orgId), fetchPrograms, {
    ttlMs: PROGRAMS_CACHE_TTL_MS,
  }).then((rows) => {
    writeProgramsLocalCache(orgId, rows)
    return rows
  })
}

export function invalidateProgramsListCache(orgId?: string | null): void {
  if (orgId === undefined) {
    invalidateCachedFetch('programs:list:')
    return
  }
  invalidateCachedFetch(programsListCacheKey(orgId))
}
