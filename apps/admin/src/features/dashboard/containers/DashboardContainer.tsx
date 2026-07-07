'use client'

import { useEffect, useState } from 'react'
import { BillingScopeSelect } from '@/components/admin/BillingScopeSelect'
import { fetchWaitlist } from '@/features/waitlist/services/waitlist.service'
import type { WaitlistResponse } from '@/features/waitlist/types/waitlist.types'
import { DashboardMetricsCards } from '../components/DashboardMetricsCards'
import { getDashboardStats } from '../services/dashboard.service'
import type { AdminBillingScope, DashboardStats } from '../types/dashboard.types'

export function DashboardContainer() {
  const [billingScope, setBillingScope] = useState<AdminBillingScope>('all')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [waitlist, setWaitlist] = useState<WaitlistResponse['metrics'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [dashboard, waitlistData] = await Promise.all([
          getDashboardStats(billingScope),
          fetchWaitlist().catch(() => null),
        ])
        setStats(dashboard)
        setWaitlist(waitlistData?.metrics ?? null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard stats')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [billingScope])

  return (
    <div className="space-y-spacing-6">
      <div className="flex justify-end">
        <BillingScopeSelect value={billingScope} onChange={setBillingScope} />
      </div>
      <DashboardMetricsCards stats={stats} loading={loading} error={error} waitlist={waitlist} />
    </div>
  )
}
