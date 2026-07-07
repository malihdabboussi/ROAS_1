'use client'

import { useCallback, useEffect, useState } from 'react'
import { dmService, type DmConversation } from './human-dm-api'

export function useDmList(enabled = true) {
  const [dms, setDms] = useState<DmConversation[]>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!enabled) {
      setDms([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await dmService.listDms()
      setDms(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load DMs')
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void reload()
  }, [reload])

  return { dms, loading, error, reload }
}
