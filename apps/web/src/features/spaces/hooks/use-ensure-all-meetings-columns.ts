'use client'

import { useEffect, useRef } from 'react'
import { ensureAllMeetingsListColumns } from '@/lib/spaces/all-meetings-list-columns'
import { updateSpace } from '../services/spaces.service'
import { useSpacesStore } from '../store/use-spaces-store'
import type { SpaceSchema } from '../types/space-schema'

export function useEnsureAllMeetingsColumns(spaceId: string | null) {
  const appliedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!spaceId) return
    if (appliedFor.current === spaceId) return
    const space = useSpacesStore.getState().spaces.find((row) => row.id === spaceId)
    if (!space?.schema) return
    const current = space.schema as SpaceSchema
    const next = ensureAllMeetingsListColumns(current) as SpaceSchema
    if (next === current) {
      appliedFor.current = spaceId
      return
    }
    appliedFor.current = spaceId
    useSpacesStore.getState().patchActiveSpaceSchema(next as unknown as Record<string, unknown>)
    void updateSpace(spaceId, { schema: next }).catch(() => {
      appliedFor.current = null
    })
  }, [spaceId])
}
