'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Clock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { billingApi } from '@/features/settings/services/billing-api'
import type { UsageEvent } from '@/features/settings/types/billing.types'
import { formatBrainActionLabel } from '@/features/settings/utils/brain-usage-labels'
import { SETTINGS_TOAST_ERRORS } from '../../../config/settings-toast-errors.config'

export default function UsageTable() {
  const [events, setEvents] = useState<UsageEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadUsage()
  }, [])

  const loadUsage = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await billingApi.getUsage()
      setEvents(data)
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : SETTINGS_TOAST_ERRORS.USAGE_LOAD_FAILED.userMessage
      setError('Failed to load usage history')
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatCredits = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K` : n.toString()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gap-spacing-2 py-spacing-8 text-destructive flex items-center justify-center">
        <AlertCircle className="h-5 w-5" />
        <span className="body-2">{error}</span>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center justify-center py-12">
        <Clock className="mb-spacing-2 h-8 w-8 opacity-50" />
        <p className="body-2">No usage history yet</p>
        <p className="body-3 mt-spacing-1">Credit usage will appear here as you use ROAS</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-border border-b">
            <th className="body-3 px-spacing-3 py-spacing-3 text-muted-foreground text-left font-medium">
              Date
            </th>
            <th className="body-3 px-spacing-3 py-spacing-3 text-muted-foreground text-left font-medium">
              Feature
            </th>
            <th className="body-3 px-spacing-3 py-spacing-3 text-muted-foreground text-left font-medium">
              Action
            </th>
            <th className="body-3 px-spacing-3 py-spacing-3 text-muted-foreground text-right font-medium">
              Credits
            </th>
            <th className="body-3 px-spacing-3 py-spacing-3 text-muted-foreground text-right font-medium">
              Cost
            </th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr
              key={event.id}
              className="border-border/50 hover:bg-secondary/30 border-b transition-colors"
            >
              <td className="body-3 px-spacing-3 py-spacing-3 text-muted-foreground">
                {formatDate(event.created_at)}
              </td>
              <td className="body-3 px-spacing-3 py-spacing-3 text-foreground">
                {event.feature?.toLowerCase() === 'brain' ? 'Brain' : event.feature}
              </td>
              <td className="body-3 px-spacing-3 py-spacing-3 text-muted-foreground">
                {event.feature?.toLowerCase() === 'brain'
                  ? formatBrainActionLabel(event.action)
                  : event.action}
              </td>
              <td className="body-3 px-spacing-3 py-spacing-3 text-foreground text-right">
                {formatCredits(event.credits_charged)}
              </td>
              <td className="body-3 px-spacing-3 py-spacing-3 text-muted-foreground text-right">
                ${event.computed_cost.toFixed(4)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
