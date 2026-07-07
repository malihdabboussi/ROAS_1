'use client'

import { useCallback, useEffect, useState } from 'react'
import { Brain } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { useUserRole } from '@/hooks/use-user-role'
import { useOrgStore } from '@/lib/org/org-context-store'
import {
  fetchCustomerBrainStatus,
  setCustomerBrainEnabled,
  toggleCortexMax,
} from '../../lib/brain-settings-api'
import { createClient } from '@/lib/supabase/client'
import { CompanyCortexSignalsCard } from './brain-page/CompanyCortexSignalsCard'

type CortexBrainType = 'user' | 'agent' | 'customer'

type BrainRow = {
  id: string
  label: string
  type: CortexBrainType
  cortex_max: boolean
}

type BrainRecord = {
  id: string
  name: string | null
  scope: string | null
  is_default: boolean | null
  agent_id: string | null
  campaign_id: string | null
  cortex_max: boolean | null
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

export default function BrainPageContent() {
  const { loading: roleLoading } = useUserRole()
  const isOrg = useOrgStore((s) => s.isOrgContext())

  const [allBrains, setAllBrains] = useState<BrainRow[]>([])
  const [togglingBrainId, setTogglingBrainId] = useState<string | null>(null)
  const [customerBrain, setCustomerBrain] = useState<{
    brainId: string | null
    enabled: boolean
  }>({ brainId: null, enabled: false })
  const [togglingCustomerBrain, setTogglingCustomerBrain] = useState(false)

  const loadBrains = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setAllBrains([])
      return
    }

    const [brainsRes, agentsRes] = await Promise.all([
      // eslint-disable-next-line no-restricted-syntax -- direct brain settings query
      supabase
        .from('ns_brains')
        .select('id, name, scope, is_default, agent_id, campaign_id, cortex_max')
        .eq('status', 'active')
        .eq('owner_id', user.id)
        .is('org_id', null)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true }),
      // eslint-disable-next-line no-restricted-syntax -- direct agent registry query for brain scope
      supabase.from('agents_registry').select('agent_key, name').is('org_id', null),
    ])

    const agentNames = new Map(
      (agentsRes.data ?? []).map((a: { agent_key: string; name: string | null }) => [
        a.agent_key,
        a.name,
      ]),
    )

    const rows: BrainRow[] = []
    for (const b of (brainsRes.data ?? []) as BrainRecord[]) {
      if (b.campaign_id) continue

      let type: CortexBrainType | null = null
      let label = 'Your Brain'

      if (b.scope === 'customer') {
        type = 'customer'
        label = b.name?.trim() || 'Customer Brain'
      } else if (b.agent_id) {
        if (!agentNames.has(b.agent_id)) continue
        type = 'agent'
        label = agentNames.get(b.agent_id) ?? b.agent_id
      } else if (b.scope === 'user' || (!b.scope && b.is_default === true)) {
        type = 'user'
      }

      if (!type) continue

      rows.push({
        id: b.id,
        label,
        type,
        cortex_max: b.cortex_max === true,
      })
    }
    setAllBrains(rows)
  }, [])

  useEffect(() => {
    loadBrains()
    fetchCustomerBrainStatus()
      .then((res) => setCustomerBrain({ brainId: res.brain_id, enabled: res.enabled }))
      .catch(() => setCustomerBrain({ brainId: null, enabled: false }))
  }, [loadBrains])

  const handleCortexToggle = async (brainId: string, currentValue: boolean) => {
    setTogglingBrainId(brainId)
    try {
      const res = await toggleCortexMax(brainId, !currentValue)
      if (!res.success) throw new Error(res.error ?? 'Failed to toggle Cortex Max.')
      setAllBrains((prev) =>
        prev.map((b) => (b.id === brainId ? { ...b, cortex_max: res.cortex_max } : b)),
      )
      toast.success(
        res.cortex_max
          ? res.initial_sync_triggered
            ? 'Cortex Max enabled. Initial library sync started.'
            : 'Cortex Max enabled.'
          : 'Cortex Max disabled.',
      )
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to toggle Cortex Max.'))
    } finally {
      setTogglingBrainId(null)
    }
  }

  const handleCustomerBrainToggle = async () => {
    const next = !customerBrain.enabled
    setTogglingCustomerBrain(true)
    setCustomerBrain((prev) => ({ ...prev, enabled: next }))
    try {
      const res = await setCustomerBrainEnabled(next)
      setCustomerBrain({ brainId: res.brain_id, enabled: res.enabled })
      toast.success(res.enabled ? 'Customer Brain enabled.' : 'Customer Brain disabled.')
    } catch {
      setCustomerBrain((prev) => ({ ...prev, enabled: !next }))
      toast.error('Failed to toggle Customer Brain.')
    } finally {
      setTogglingCustomerBrain(false)
    }
  }

  if (roleLoading) {
    return (
      <div className="flex h-full min-h-[400px] w-full items-center justify-center">
        <VibeyLoadingOrb state="processing" size="sm" />
      </div>
    )
  }

  return (
    <div className="p-spacing-4 sm:p-spacing-8 space-y-spacing-6">
      <div className="min-w-0">
        <h1 className="title-h5 text-foreground">BRAIN</h1>
        <p className="body-3 text-muted-foreground mt-spacing-1">
          Crystallize your knowledge from every source.
        </p>
      </div>

      <p className="body-4 text-muted-foreground font-medium uppercase tracking-wider">Brains</p>

      {isOrg ? <CompanyCortexSignalsCard /> : null}

      {allBrains.length > 0 && (
        <div className="surface-card card-elevated border-border rounded-spacing-3 border">
          <div className="p-spacing-4 space-y-spacing-4">
            <div className="gap-spacing-3 flex items-center">
              <Image
                src="/icons/cortex_max.png"
                alt="Cortex Max"
                width={48}
                height={48}
                className="h-spacing-10 w-spacing-10 shrink-0 object-contain"
                priority
              />
              <div>
                <h3
                  className="flex items-center gap-1.5"
                  style={{
                    fontFamily: 'var(--font-site-headline)',
                    fontWeight: 800,
                    fontSize: '18px',
                    letterSpacing: '2px',
                  }}
                >
                  <span className="text-foreground">CORTEX</span>
                  <span className="cortex-max-gradient-text">MAX</span>
                </h3>
                <p className="body-3 text-muted-foreground">
                  Enable narrative intelligence per brain. Atlas organizes knowledge into pages,
                  detects belief patterns, and runs health checks.
                </p>
              </div>
            </div>

            <div className="border-border overflow-hidden rounded-lg border">
              <table className="w-full">
                <thead>
                  <tr className="border-border border-b bg-surface-subtle">
                    <th className="body-4 text-muted-foreground px-4 py-2.5 text-left font-medium uppercase tracking-wider">
                      Brain
                    </th>
                    <th className="body-4 text-muted-foreground px-4 py-2.5 text-left font-medium uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-2.5 text-right">
                      <span
                        className="flex items-center justify-end gap-1"
                        style={{
                          fontFamily: 'var(--font-site-headline)',
                          fontWeight: 700,
                          fontSize: '11px',
                          letterSpacing: '1.5px',
                        }}
                      >
                        <span className="text-muted-foreground">CORTEX</span>
                        <span className="cortex-max-gradient-text">MAX</span>
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {allBrains.map((brain) => {
                    const typeBadge =
                      brain.type === 'customer'
                        ? 'badge-glass-blue'
                        : brain.type === 'agent'
                          ? 'badge-glass-orange'
                          : 'badge-glass-green'
                    const isToggling = togglingBrainId === brain.id

                    return (
                      <tr
                        key={brain.id}
                        className="border-border border-b transition-colors last:border-0 hover:bg-hover-subtle"
                      >
                        <td className="px-4 py-3">
                          <div className="gap-spacing-2 flex items-center">
                            <Brain className="icon-sm text-muted-foreground shrink-0" />
                            <span className="body-3 text-foreground font-medium">
                              {brain.label}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge-glass typo-caption font-medium ${typeBadge}`}>
                            {brain.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={brain.cortex_max}
                            onClick={() => handleCortexToggle(brain.id, brain.cortex_max)}
                            disabled={isToggling}
                            className={`switch-glass-cortex-max h-5 w-9 rounded-full ${isToggling ? 'opacity-50' : ''}`}
                          >
                            <span
                              className={`switch-glass-primary-thumb block h-4 w-4 rounded-full ${
                                brain.cortex_max ? 'translate-x-4' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="surface-card card-elevated border-border rounded-spacing-3 border">
        <div className="p-spacing-4 space-y-spacing-3">
          <div className="gap-spacing-4 flex items-center justify-between">
            <div className="gap-spacing-3 flex min-w-0 items-start">
              <Brain className="icon-sm text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <h3 className="title-h6 font-medium">Customer Brain</h3>
                <p className="body-3 text-muted-foreground mt-spacing-1">
                  Turn on the customer intelligence layer for this workspace. Atlas uses it to
                  organize customer signals from contacts and conversations.
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={customerBrain.enabled}
              onClick={handleCustomerBrainToggle}
              disabled={togglingCustomerBrain}
              className={`switch-glass-primary h-5 w-9 rounded-full ${
                togglingCustomerBrain ? 'opacity-50' : ''
              }`}
            >
              <span
                className={`switch-glass-primary-thumb block h-4 w-4 rounded-full ${
                  customerBrain.enabled ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
