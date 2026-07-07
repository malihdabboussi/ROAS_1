'use client'

import { backendGet } from '@/lib/api/backend-client'
import { createCachedResource } from '@/lib/cache/cached-resource'

export interface OrgPerson {
  user_id: string
  display_name: string
  avatar_url: string | null
  status_emoji: string | null
  status_text: string | null
  org_role: string | null
  last_dm_at: string | null
}

const peopleResource = createCachedResource<OrgPerson[]>(
  async () => {
    const res = await backendGet<{ people: OrgPerson[] }>('/api/sidebar/people')
    return res.people
  },
  { ttlMs: 60_000 },
)

export const peopleCache = {
  invalidate: () => peopleResource.invalidate(),
  reload: () => peopleResource.reload(),
  peek: () => peopleResource.peek(),
  mutate: (next: OrgPerson[] | ((prev: OrgPerson[] | undefined) => OrgPerson[])) =>
    peopleResource.mutate(next),
}

export function useOrgPeople(enabled = true) {
  const { data, loading, error, reload } = peopleResource.use({ enabled })
  return {
    people: data ?? [],
    loading,
    error,
    reload,
  }
}
