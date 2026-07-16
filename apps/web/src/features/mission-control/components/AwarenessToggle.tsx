'use client'

import { useCallback, useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Info, Settings, X } from 'lucide-react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/forms/switch'
import { Tooltip } from '@/components/ui/tooltip'
import { billingApi } from '@/lib/billing/billing-api'
import { useAccountSettingsModal } from '@/lib/settings/account-settings-modal-context'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import { fetchProfileSettings, toggleAwareness } from '../services/missions.service'

export interface AwarenessToggleProps {
  /** Show a short “what Autopilot does next” line under the switch (Ops Desk). */
  showStatusHint?: boolean
  statusHint?: string
  openSettingsLabel?: string
  onOpenStrategy?: () => void
  onEnabledChange?: (enabled: boolean) => void
}

export function AwarenessToggle({
  showStatusHint = false,
  statusHint,
  openSettingsLabel = 'Set strategy',
  onOpenStrategy,
  onEnabledChange,
}: AwarenessToggleProps = {}) {
  const { openAccountSettings } = useAccountSettingsModal()
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [canUseAutopilot, setCanUseAutopilot] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalSaving, setModalSaving] = useState(false)
  const [autoRechargeEnabled, setAutoRechargeEnabled] = useState(false)
  const [triggerCredits, setTriggerCredits] = useState(500)
  const [topupCredits, setTopupCredits] = useState(2000)
  const [monthlyCapDollars, setMonthlyCapDollars] = useState('')

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const [settings, billingStatus] = await Promise.all([
        fetchProfileSettings().catch(() => null),
        billingApi.getStatus().catch(() => null),
      ])

      if (!mounted) return

      const planSlug = billingStatus?.plan?.slug ?? 'free'
      const isPaid = planSlug !== 'free'
      const credits = billingStatus?.balance?.totalAvailable ?? 0
      setCanUseAutopilot(isPaid || credits > 0)

      const nextEnabled = settings?.awareness_loop_enabled ?? false
      setEnabled(nextEnabled)
      onEnabledChange?.(nextEnabled)
      setLoading(false)
    }
    void load()
    return () => {
      mounted = false
    }
    // Intentionally once on mount — parent callback identity should not refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadAutoRechargeSettings = useCallback(async () => {
    setModalLoading(true)
    try {
      const settings = await billingApi.getAutoRechargeSettings()
      setAutoRechargeEnabled(settings.is_enabled)
      setTriggerCredits(settings.trigger_credits)
      setTopupCredits(settings.topup_credits)
      setMonthlyCapDollars(
        settings.monthly_cap_cents === null
          ? ''
          : String(Math.floor(settings.monthly_cap_cents / 100)),
      )
    } catch {
      setAutoRechargeEnabled(false)
      setTriggerCredits(500)
      setTopupCredits(2000)
      setMonthlyCapDollars('')
    }
    setModalLoading(false)
  }, [])

  const handleToggle = useCallback(
    async (checked: boolean) => {
      if (checked) {
        setModalOpen(true)
        if (canUseAutopilot && !modalOpen) void loadAutoRechargeSettings()
        return
      }

      setEnabled(false)
      onEnabledChange?.(false)
      try {
        const result = await toggleAwareness(false)
        setEnabled(result.awareness_loop_enabled)
        onEnabledChange?.(result.awareness_loop_enabled)
      } catch {
        setEnabled(true)
        onEnabledChange?.(true)
      }
    },
    [canUseAutopilot, loadAutoRechargeSettings, modalOpen, onEnabledChange],
  )

  const handleConfirmEnable = useCallback(async () => {
    const normalizedTrigger = Math.max(0, Math.floor(triggerCredits))
    const normalizedTopup = Math.max(2000, Math.floor(topupCredits / 200) * 200)
    const parsedMonthlyCap = monthlyCapDollars.trim()
    const monthlyCap =
      parsedMonthlyCap === ''
        ? null
        : Math.max(1000, Math.floor(Number.parseInt(parsedMonthlyCap, 10) || 0) * 100)

    setModalSaving(true)
    try {
      await billingApi.updateAutoRechargeSettings({
        enabled: autoRechargeEnabled,
        triggerCredits: normalizedTrigger,
        topupCredits: normalizedTopup,
        monthlyCap,
      })

      if (!enabled) {
        const result = await toggleAwareness(true)
        setEnabled(result.awareness_loop_enabled)
        onEnabledChange?.(result.awareness_loop_enabled)
        if (result.awareness_loop_enabled) {
          toast.success(
            'Autopilot is on. Vibey will watch campaigns and deploy from your strategy.',
          )
        }
      }
      setModalOpen(false)
    } catch (err) {
      toast.error(sanitizeUserError(err, 'Failed to save Autopilot settings'))
      if (!enabled) {
        setEnabled(false)
        onEnabledChange?.(false)
      }
    }
    setModalSaving(false)
  }, [
    autoRechargeEnabled,
    enabled,
    monthlyCapDollars,
    onEnabledChange,
    topupCredits,
    triggerCredits,
  ])

  return (
    <>
      <div className="gap-spacing-1 flex flex-col items-end">
        <div className="flex items-center gap-2">
          <span className="body-4 text-muted-foreground whitespace-nowrap">ROAS Autopilot</span>
          <Switch checked={enabled} onCheckedChange={handleToggle} disabled={loading} />
          {enabled ? (
            <button
              type="button"
              onClick={() => {
                setModalOpen(true)
                void loadAutoRechargeSettings()
              }}
              className="btn-icon-glass"
              title="Autopilot settings"
            >
              <Settings className="icon-sm" />
            </button>
          ) : null}
        </div>
        {showStatusHint && enabled && statusHint ? (
          <div className="gap-spacing-1 flex max-w-xs flex-col items-end text-right">
            <p className="body-4 text-muted-foreground">{statusHint}</p>
            {onOpenStrategy ? (
              <button
                type="button"
                onClick={onOpenStrategy}
                className="body-4 text-foreground underline-offset-2 hover:underline"
              >
                {openSettingsLabel}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <Dialog.Root open={modalOpen} onOpenChange={setModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="z-modal-backdrop bg-modal-overlay fixed inset-0" />
          <Dialog.Content className="z-modal-content fixed inset-0 flex items-center justify-center p-4">
            <div className="surface-card wizard-container-border rounded-spacing-4 w-full max-w-lg p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <Dialog.Title className="body-1 text-foreground font-semibold uppercase">
                    {enabled ? 'Autopilot Settings' : 'Enable ROAS Autopilot'}
                  </Dialog.Title>
                  <Dialog.Description className="body-2 text-muted-foreground mt-2">
                    Autopilot lets Vibey watch your campaigns and act like an ops lead: create and
                    assign missions from your strategy, retry stuck work, and keep the floor moving
                    without you babysitting. It uses{' '}
                    <span className="text-foreground font-bold">credits</span> when agents run —
                    enable auto-purchase so it doesn’t stop mid-flight.
                  </Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <button type="button" className="btn-icon-bare flex-shrink-0">
                    <X className="icon-sm" />
                  </button>
                </Dialog.Close>
              </div>

              {!canUseAutopilot ? (
                <p className="body-2 text-muted-foreground py-4">
                  Autopilot requires credits to run. Purchase credits or upgrade your plan to get
                  started.
                </p>
              ) : modalLoading ? (
                <p className="body-3 text-muted-foreground py-4">Loading settings...</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <label className="body-2 text-foreground">Auto purchase credits</label>
                      <span className="badge-glass badge-glass-sm badge-glass-blue typo-caption">
                        Recommended
                      </span>
                      <Tooltip
                        wide
                        label="Gives ROAS the option to keep on going without getting stuck when credits are finished"
                      >
                        <Info className="icon-sm text-muted-foreground cursor-help" />
                      </Tooltip>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={autoRechargeEnabled}
                      onClick={() => setAutoRechargeEnabled((v) => !v)}
                      className="switch-glass-primary relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-all duration-300"
                    >
                      <span
                        className={`switch-glass-primary-thumb pointer-events-none block h-4 w-4 rounded-full transition-transform duration-300 ${autoRechargeEnabled ? 'translate-x-4' : 'translate-x-1'}`}
                      />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="body-3 text-muted-foreground">Trigger at credits</label>
                    <input
                      type="number"
                      min={0}
                      value={triggerCredits}
                      onChange={(e) =>
                        setTriggerCredits(Math.max(0, Number.parseInt(e.target.value || '0', 10)))
                      }
                      className="input-glass h-10 w-full rounded-lg px-3"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="body-3 text-muted-foreground">Top-up credits</label>
                    <input
                      type="number"
                      step={200}
                      min={2000}
                      value={topupCredits}
                      onChange={(e) =>
                        setTopupCredits(Math.max(0, Number.parseInt(e.target.value || '0', 10)))
                      }
                      className="input-glass h-10 w-full rounded-lg px-3"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="body-3 text-muted-foreground">Monthly cap ($ / month)</label>
                    <input
                      type="number"
                      min={10}
                      value={monthlyCapDollars}
                      placeholder="No cap"
                      onChange={(e) => setMonthlyCapDollars(e.target.value)}
                      className="input-glass h-10 w-full rounded-lg px-3"
                    />
                    <p className="body-4 text-muted-foreground">
                      Example: trigger at 1,000, top-up 20,000, cap at $1,000/month.
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-6 flex gap-2">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="button-glass-neutral flex-1 rounded-lg px-4 py-2"
                  >
                    Cancel
                  </button>
                </Dialog.Close>
                {!canUseAutopilot ? (
                  <button
                    type="button"
                    onClick={() => {
                      setModalOpen(false)
                      openAccountSettings('billing')
                    }}
                    className="button-glass-accent flex-1 rounded-lg px-4 py-2"
                  >
                    Get Credits
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleConfirmEnable()}
                    disabled={modalSaving || modalLoading}
                    className="button-glass-accent flex-1 rounded-lg px-4 py-2 disabled:opacity-50"
                  >
                    {modalSaving ? 'Saving...' : enabled ? 'Save Settings' : 'Enable Autopilot'}
                  </button>
                )}
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
