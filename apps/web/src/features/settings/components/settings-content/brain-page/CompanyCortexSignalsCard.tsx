'use client'

import { useCallback, useEffect, useState } from 'react'
import { Building2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  fetchCompanyCortexSignals,
  reviewCompanyCortexSignal,
  type CompanyCortexSignal,
} from '@/lib/brain'

export function CompanyCortexSignalsCard() {
  const [signals, setSignals] = useState<CompanyCortexSignal[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewingSignalId, setReviewingSignalId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setSignals(await fetchCompanyCortexSignals())
    } catch {
      setSignals([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const reviewSignal = async (signalId: string, decision: 'approve' | 'reject') => {
    setReviewingSignalId(signalId)
    try {
      await reviewCompanyCortexSignal(signalId, decision)
      setSignals((prev) => prev.filter((signal) => signal.id !== signalId))
      toast.success(
        decision === 'approve'
          ? 'Company signal approved and queued for formation.'
          : 'Company signal rejected.',
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not review company signal.')
    } finally {
      setReviewingSignalId(null)
    }
  }

  if (loading) {
    return (
      <div className="surface-card card-elevated border-border rounded-spacing-3 border">
        <div className="p-spacing-4">
          <p className="body-3 text-muted-foreground">Loading Company Cortex...</p>
        </div>
      </div>
    )
  }

  if (signals.length === 0) return null

  return (
    <div className="surface-card card-elevated border-border rounded-spacing-3 border">
      <div className="p-spacing-4 space-y-spacing-4">
        <div className="gap-spacing-3 flex min-w-0 items-start">
          <Building2 className="icon-sm text-muted-foreground mt-spacing-1 shrink-0" />
          <div className="min-w-0">
            <h3 className="title-h6 font-medium">Company Cortex</h3>
            <p className="body-3 text-muted-foreground mt-spacing-1">
              Review what Atlas noticed before it becomes part of Company Cortex.
            </p>
          </div>
        </div>

        <div className="space-y-spacing-2">
          {signals.slice(0, 5).map((signal) => (
            <div
              key={signal.id}
              className="border-border rounded-spacing-2 p-spacing-3 space-y-spacing-2 border"
            >
              <div className="gap-spacing-2 flex items-start justify-between">
                <div className="min-w-0">
                  <p className="body-4 text-muted-foreground uppercase tracking-wider">
                    {signal.signal_type.replace(/_/g, ' ')} · {Math.round(signal.confidence * 100)}%
                  </p>
                  <p className="body-3 text-foreground mt-spacing-1">{signal.truth}</p>
                  {signal.context_form ? (
                    <p className="body-4 text-muted-foreground mt-spacing-1">
                      Context: {signal.context_form}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="gap-spacing-2 flex justify-end">
                <button
                  type="button"
                  disabled={reviewingSignalId === signal.id}
                  onClick={() => reviewSignal(signal.id, 'reject')}
                  className="button-compact button-glass-neutral"
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={reviewingSignalId === signal.id}
                  onClick={() => reviewSignal(signal.id, 'approve')}
                  className="button-compact button-glass-primary"
                >
                  Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
