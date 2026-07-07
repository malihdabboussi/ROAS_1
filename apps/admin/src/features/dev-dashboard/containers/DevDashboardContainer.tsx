'use client'

import { useEffect, useState } from 'react'
import { MachineMetricsCard } from '@/features/dashboard/components/MachineMetricsCard'
import { getMachineStats } from '@/features/dashboard/services/dashboard.service'
import type { MachineStats } from '@/features/dashboard/types/dashboard.types'
import type { AgentTraceSummary } from '@/features/traces/types/agent-trace.types'
import { adminGet } from '@/lib/api/admin-client'
import { DevMetricsCards } from '../components/DevMetricsCards'

type ErrorsData = {
  errors: Array<{
    id: string
    created_at: string
    severity: string | null
    resolved: boolean | null
    app: string | null
    category: string | null
  }>
}

export function DevDashboardContainer() {
  const [machineStats, setMachineStats] = useState<MachineStats | null>(null)
  const [errors, setErrors] = useState<ErrorsData | null>(null)
  const [traces, setTraces] = useState<AgentTraceSummary[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [machines, errorsData, tracesData] = await Promise.all([
        getMachineStats().catch(() => null),
        adminGet<ErrorsData>('errors').catch(() => null),
        adminGet<AgentTraceSummary[]>('traces?limit=100').catch(() => null),
      ])
      setMachineStats(machines)
      setErrors(errorsData)
      setTraces(tracesData)
      setLoading(false)
    }
    void load()
  }, [])

  return (
    <div className="space-y-spacing-6">
      <DevMetricsCards
        machineStats={machineStats}
        errors={errors?.errors ?? null}
        traces={traces}
        loading={loading}
      />
      <MachineMetricsCard stats={machineStats} loading={loading} />
    </div>
  )
}
