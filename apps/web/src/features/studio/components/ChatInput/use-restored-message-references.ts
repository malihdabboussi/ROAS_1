import { useEffect, useState } from 'react'
import type { MessageReference } from '../../types'

export function useRestoredRefs(
  initialReferences: MessageReference[] | undefined,
  restoreNonce: string | undefined,
) {
  const [references, setReferences] = useState<MessageReference[]>(initialReferences ?? [])
  useEffect(() => {
    if (!restoreNonce) return
    setReferences(initialReferences ?? [])
  }, [initialReferences, restoreNonce])
  return [references, setReferences] as const
}
