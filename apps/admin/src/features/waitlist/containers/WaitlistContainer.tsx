'use client'

import { useCallback, useEffect, useState } from 'react'
import { WaitlistMetricsCards } from '../components/WaitlistMetricsCards'
import { WaitlistTable } from '../components/WaitlistTable'
import { fetchWaitlist, sendInvite } from '../services/waitlist.service'
import type { WaitlistResponse } from '../types/waitlist.types'

export function WaitlistContainer() {
  const [data, setData] = useState<WaitlistResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchWaitlist()
      setData(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load waitlist')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const onSendInvite = useCallback(
    async (id: string) => {
      setSendingId(id)
      try {
        await sendInvite(id)
        await load()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to send invite')
      } finally {
        setSendingId(null)
      }
    },
    [load],
  )

  if (loading && !data) {
    return <div className="body-3 text-muted-foreground">Loading waitlist…</div>
  }

  if (error && !data) {
    return (
      <div className="body-2 text-destructive">
        {error}
        <button type="button" onClick={() => void load()} className="ml-spacing-3 underline">
          Retry
        </button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="w-full">
      {error && (
        <div className="body-2 text-destructive mb-spacing-4">
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-spacing-2 underline">
            Dismiss
          </button>
        </div>
      )}
      <WaitlistMetricsCards metrics={data.metrics} />
      <WaitlistTable entries={data.entries} sendingId={sendingId} onSendInvite={onSendInvite} />
    </div>
  )
}
