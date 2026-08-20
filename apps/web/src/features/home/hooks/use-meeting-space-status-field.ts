import { useEffect, useState } from 'react'
import { fetchSpaceById } from '@/lib/spaces'
import type { FieldDef } from '@/lib/spaces/space-schema-types'

export function useMeetingSpaceStatusField(spaceId: string) {
  const [field, setField] = useState<FieldDef | undefined>()
  useEffect(() => {
    let cancelled = false
    void fetchSpaceById(spaceId)
      .then((space) => {
        if (cancelled) return
        const next =
          space.schema?.fields?.find((candidate) => candidate.id === 'call_status') ??
          space.schema?.fields?.find((candidate) => candidate.id === 'status')
        if (next?.type === 'select') setField(next as FieldDef)
      })
      .catch(() => {
        if (!cancelled) setField(undefined)
      })
    return () => {
      cancelled = true
    }
  }, [spaceId])
  return field
}
