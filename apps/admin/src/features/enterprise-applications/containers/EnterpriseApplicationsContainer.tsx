'use client'

import { useCallback, useEffect, useState } from 'react'
import { EnterpriseApplicationsMetrics } from '../components/EnterpriseApplicationsMetrics'
import { EnterpriseApplicationsTable } from '../components/EnterpriseApplicationsTable'
import {
  fetchEnterpriseApplications,
  updateEnterpriseApplication,
} from '../services/enterprise-applications.service'
import type { EnterpriseApplicationsResponse } from '../types/enterprise-applications.types'

export function EnterpriseApplicationsContainer() {
  const [data, setData] = useState<EnterpriseApplicationsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchEnterpriseApplications()
      setData(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load applications')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const onUpdateStatus = useCallback(
    async (id: string, status: string) => {
      setUpdatingId(id)
      try {
        await updateEnterpriseApplication(id, { status })
        await load()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update')
      } finally {
        setUpdatingId(null)
      }
    },
    [load],
  )

  const onUpdateNotes = useCallback(
    async (id: string, notes: string) => {
      setUpdatingId(id)
      try {
        await updateEnterpriseApplication(id, { notes })
        await load()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update')
      } finally {
        setUpdatingId(null)
      }
    },
    [load],
  )

  if (loading && !data) {
    return <div className="body-3 text-muted-foreground">Loading applications…</div>
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
      <EnterpriseApplicationsMetrics metrics={data.metrics} />
      <EnterpriseApplicationsTable
        entries={data.entries}
        updatingId={updatingId}
        onUpdateStatus={onUpdateStatus}
        onUpdateNotes={onUpdateNotes}
      />
    </div>
  )
}
