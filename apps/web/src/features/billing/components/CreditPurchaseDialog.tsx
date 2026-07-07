'use client'

import { useCallback, useEffect, useState } from 'react'
import { Minus, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { billingApi } from '@/lib/billing/billing-api'
import type { AutoRechargeSettings } from '@/lib/billing/billing.types'
import { BILLING_TOAST_ERRORS } from '../config/billing-toast-errors.config'
import { CreditPurchaseSuccessDialog } from './CreditPurchaseSuccessDialog'

interface CreditPurchaseDialogProps {
  open: boolean
  onClose: () => void
  currentCredits?: number
  initialMode?: 'buy' | 'auto'
}

const PACK_PRICE = 10
const CREDITS_PER_PACK = 2000
const PRESET_QUANTITIES = [1, 3, 5, 10]

export function CreditPurchaseDialog({
  open,
  onClose,
  currentCredits = 0,
  initialMode = 'buy',
}: CreditPurchaseDialogProps) {
  const [mode, setMode] = useState<'buy' | 'auto'>(initialMode)
  const [quantity, setQuantity] = useState(3)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successData, setSuccessData] = useState<{
    previousCredits: number
    currentCredits: number
  } | null>(null)

  const [autoRecharge, setAutoRecharge] = useState<AutoRechargeSettings | null>(null)
  const [autoLoading, setAutoLoading] = useState(false)
  const [triggerCredits, setTriggerCredits] = useState(500)
  const [topupCredits, setTopupCredits] = useState(2000)
  const [monthlyCapDollars, setMonthlyCapDollars] = useState('')
  const [autoSaving, setAutoSaving] = useState(false)
  const [autoSaveMsg, setAutoSaveMsg] = useState<string | null>(null)

  useEffect(() => {
    if (open) setMode(initialMode)
  }, [open, initialMode])

  const loadAutoRecharge = useCallback(async () => {
    setAutoLoading(true)
    try {
      const data = await billingApi.getAutoRechargeSettings()
      setAutoRecharge(data)
      setTriggerCredits(data.trigger_credits)
      setTopupCredits(data.topup_credits)
      setMonthlyCapDollars(
        data.monthly_cap_cents === null ? '' : String(Math.floor(data.monthly_cap_cents / 100)),
      )
    } catch {
      /* silent */
    }
    setAutoLoading(false)
  }, [])

  useEffect(() => {
    if (open) {
      loadAutoRecharge()
    }
  }, [open, loadAutoRecharge])

  if (!open && !successData) return null

  const totalPrice = PACK_PRICE * quantity
  const totalCredits = CREDITS_PER_PACK * quantity

  const handlePurchase = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await billingApi.purchaseCredits('pack-medium', quantity)

      if ('credits' in result && result.charged) {
        setLoading(false)
        setSuccessData({
          previousCredits: currentCredits,
          currentCredits: currentCredits + result.credits,
        })
      } else if ('url' in result) {
        window.location.href = result.url
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : BILLING_TOAST_ERRORS.PURCHASE_START_FAILED.userMessage
      setError(`Failed to start purchase: ${err instanceof Error ? err.message : String(err)}`)
      toast.error(msg)
      setLoading(false)
    }
  }

  const handleSaveAutoRecharge = async (enabled: boolean) => {
    const normalizedTrigger = Math.max(0, Math.floor(triggerCredits))
    const normalizedTopup = Math.max(2000, Math.floor(topupCredits / 200) * 200)
    const parsedMonthlyCap = monthlyCapDollars.trim()
    const normalizedMonthlyCap =
      parsedMonthlyCap === ''
        ? null
        : Math.max(1000, Math.floor(Number(parsedMonthlyCap || '0')) * 100)

    setAutoSaving(true)
    setAutoSaveMsg(null)
    try {
      const updated = await billingApi.updateAutoRechargeSettings({
        enabled,
        triggerCredits: normalizedTrigger,
        topupCredits: normalizedTopup,
        monthlyCap: normalizedMonthlyCap,
      })
      setAutoRecharge(updated)
      setMonthlyCapDollars(
        updated.monthly_cap_cents === null
          ? ''
          : String(Math.floor(updated.monthly_cap_cents / 100)),
      )
      setAutoSaveMsg('Saved')
    } catch (err) {
      setAutoSaveMsg('Failed to save')
      toast.error(
        err instanceof Error
          ? err.message
          : BILLING_TOAST_ERRORS.AUTO_RECHARGE_SAVE_FAILED.userMessage,
      )
    }
    setAutoSaving(false)
  }

  if (successData) {
    return (
      <CreditPurchaseSuccessDialog
        open={!!successData}
        onClose={() => {
          setSuccessData(null)
          onClose()
        }}
        previousCredits={successData.previousCredits}
        currentCredits={successData.currentCredits}
      />
    )
  }

  if (!open) return null

  const autoTopupDollars = topupCredits / 200

  return (
    <>
      <div className="fixed inset-0 z-50 bg-modal-overlay" onClick={loading ? undefined : onClose} />

      <div className="p-spacing-4 fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
        <div className="surface-card wizard-container-border rounded-spacing-4 relative flex max-h-[90vh] min-h-[480px] w-full max-w-md flex-col overflow-hidden">
          {loading ? (
            <div className="py-spacing-8 px-spacing-6 flex flex-col items-center justify-center">
              <VibeyLoadingOrb text="Processing your purchase..." state="processing" size="md" />
              <p className="body-3 text-muted-foreground mt-spacing-4 text-center">
                Charging ${totalPrice.toFixed(2)} to your card on file...
              </p>
            </div>
          ) : (
            <>
              {/* Header — tabs + close on same line */}
              <div className="px-spacing-6 pt-spacing-4 pb-spacing-2 flex flex-shrink-0 items-center justify-between">
                <div className="tabs-liquid-glass">
                  <button
                    type="button"
                    onClick={() => setMode('buy')}
                    data-state={mode === 'buy' ? 'active' : 'inactive'}
                    data-variant="liquid"
                    className="tabs-liquid-glass-trigger px-spacing-4"
                  >
                    Buy Credits
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('auto')}
                    data-state={mode === 'auto' ? 'active' : 'inactive'}
                    data-variant="liquid"
                    className="tabs-liquid-glass-trigger px-spacing-4"
                  >
                    Auto Recharge
                  </button>
                </div>
                <button type="button" onClick={onClose} className="btn-icon-bare flex-shrink-0">
                  <X className="icon-sm" />
                </button>
              </div>

              {mode === 'buy' ? (
                <div className="px-spacing-6 py-spacing-4 space-y-spacing-4 flex-1 overflow-y-auto">
                  <div className="section-card rounded-spacing-2 p-spacing-3 flex items-center justify-between">
                    <div>
                      <p className="body-3 text-muted-foreground">Each pack includes</p>
                      <p className="body-1 text-foreground font-semibold">
                        {CREDITS_PER_PACK.toLocaleString()} Credits
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="body-3 text-muted-foreground">Price</p>
                      <p className="body-1 text-foreground font-semibold">
                        ${PACK_PRICE.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-spacing-2">
                    <label className="body-2 text-foreground">Quantity</label>
                    <div className="gap-spacing-2 flex items-center">
                      <button
                        type="button"
                        className="button-glass-neutral flex h-10 w-10 items-center justify-center rounded-lg p-0 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                      >
                        <Minus className="icon-sm" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1
                          setQuantity(Math.min(20, Math.max(1, val)))
                        }}
                        className="input-glass h-10 flex-1 rounded-lg text-center"
                      />
                      <button
                        type="button"
                        className="button-glass-neutral flex h-10 w-10 items-center justify-center rounded-lg p-0 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => setQuantity(Math.min(20, quantity + 1))}
                        disabled={quantity >= 20}
                      >
                        <Plus className="icon-sm" />
                      </button>
                    </div>

                    <div className="gap-spacing-2 flex">
                      {PRESET_QUANTITIES.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setQuantity(preset)}
                          className={`body-3 p-spacing-2 rounded-spacing-1 flex-1 border transition-colors ${
                            quantity === preset
                              ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)]'
                              : 'hover:border-[var(--color-primary)]/50 border-[var(--color-border)] bg-[var(--color-secondary)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
                          }`}
                        >
                          {preset}x
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-spacing-3 mt-spacing-3 border-t border-[var(--color-border)]">
                    <div className="mb-spacing-1 flex items-center justify-between">
                      <p className="body-2 text-muted-foreground">Total Credits</p>
                      <p className="body-1 text-foreground">{totalCredits.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="body-2 text-muted-foreground">Total Price</p>
                      <p className="title-h4 text-foreground">${totalPrice.toFixed(2)}</p>
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-spacing-2 p-spacing-3 border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/5 border">
                      <p className="body-3 text-[var(--color-destructive)]">{error}</p>
                    </div>
                  )}

                  <div className="gap-spacing-2 pt-spacing-2 flex">
                    <button
                      type="button"
                      className="button-glass-neutral flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 hover:bg-[var(--color-secondary)] hover:text-[var(--color-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={onClose}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handlePurchase}
                      disabled={loading}
                      className="button-glass-accent flex-1 rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? 'Processing...' : 'Buy Now'}
                    </button>
                  </div>

                  <div className="pt-spacing-3 border-t border-[var(--color-border)]">
                    <p className="body-4 text-muted-foreground text-center">
                      By clicking &quot;Buy Now,&quot; you authorize us to charge your card on file
                      for{' '}
                      <span className="text-foreground font-medium">${totalPrice.toFixed(2)}</span>.
                      You agree to our{' '}
                      <a
                        href="https://govibey.com/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--color-primary)] hover:underline"
                      >
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a
                        href="https://govibey.com/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--color-primary)] hover:underline"
                      >
                        Privacy Policy
                      </a>
                      .
                    </p>
                  </div>
                </div>
              ) : (
                /* ── Auto Recharge mode ── */
                <div className="px-spacing-6 py-spacing-4 space-y-spacing-4 flex-1 overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="gap-spacing-2 flex items-center">
                        <p className="body-1 text-foreground font-semibold">AUTO RECHARGE</p>
                        {autoSaveMsg && (
                          <span
                            className={`body-4 ${autoSaveMsg === 'Saved' ? 'text-primary' : 'text-destructive'}`}
                          >
                            {autoSaveMsg}
                          </span>
                        )}
                      </div>
                      <p className="body-3 text-muted-foreground mt-spacing-1">
                        Automatically buy credits when your balance gets low
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={autoRecharge?.is_enabled ?? false}
                      disabled={autoSaving || autoLoading}
                      onClick={() => handleSaveAutoRecharge(!(autoRecharge?.is_enabled ?? false))}
                      className="switch-glass-primary relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-all duration-300 disabled:opacity-50"
                    >
                      <span
                        className={`switch-glass-primary-thumb pointer-events-none block h-4 w-4 rounded-full transition-transform duration-300 ${(autoRecharge?.is_enabled ?? false) ? 'translate-x-4' : 'translate-x-1'}`}
                      />
                    </button>
                  </div>

                  <div className="space-y-spacing-3">
                    <div className="space-y-spacing-1">
                      <label className="body-3 text-muted-foreground">
                        When credits drop below
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={triggerCredits}
                        onChange={(e) =>
                          setTriggerCredits(Math.max(0, parseInt(e.target.value || '0', 10)))
                        }
                        className="input-glass h-10 w-full rounded-lg px-3"
                      />
                    </div>
                    <div className="space-y-spacing-1">
                      <div className="flex items-center justify-between">
                        <label className="body-3 text-muted-foreground">
                          Monthly cap ($ / month)
                        </label>
                        {monthlyCapDollars.trim() !== '' &&
                          Number.parseInt(monthlyCapDollars, 10) < 10 && (
                            <span className="body-4 text-destructive">min $10</span>
                          )}
                      </div>
                      <input
                        type="number"
                        min={10}
                        value={monthlyCapDollars}
                        onChange={(e) => setMonthlyCapDollars(e.target.value)}
                        placeholder="No cap"
                        className={`input-glass h-10 w-full rounded-lg px-3 ${
                          monthlyCapDollars.trim() !== '' &&
                          Number.parseInt(monthlyCapDollars, 10) < 10
                            ? 'border-destructive/50'
                            : ''
                        }`}
                      />
                      <p className="body-4 text-muted-foreground">
                        Leave empty for no monthly limit.
                      </p>
                    </div>

                    <div className="space-y-spacing-1">
                      <div className="flex items-center justify-between">
                        <label className="body-3 text-muted-foreground">
                          Recharge amount (credits)
                        </label>
                        {topupCredits < 2000 && (
                          <span className="body-4 text-destructive">min 2,000 credits</span>
                        )}
                      </div>
                      <input
                        type="number"
                        step={200}
                        value={topupCredits}
                        onChange={(e) =>
                          setTopupCredits(Math.max(0, parseInt(e.target.value || '0', 10)))
                        }
                        className={`input-glass h-10 w-full rounded-lg px-3 ${topupCredits < 2000 ? 'border-destructive/50' : ''}`}
                      />
                    </div>
                  </div>

                  <div className="section-card rounded-spacing-2 p-spacing-3">
                    <div className="mb-spacing-1 flex items-center justify-between">
                      <p className="body-3 text-muted-foreground">Credits per recharge</p>
                      <p className="body-2 text-foreground font-medium">
                        {topupCredits.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="body-3 text-muted-foreground">Charge per recharge</p>
                      <p className="body-2 text-foreground font-medium">
                        ${autoTopupDollars.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="body-3 text-muted-foreground">Monthly cap</p>
                      <p className="body-2 text-foreground font-medium">
                        {monthlyCapDollars.trim() === '' ? 'No cap' : `$${monthlyCapDollars}`}
                      </p>
                    </div>
                    <p className="body-4 text-muted-foreground mt-spacing-2">
                      $1 = 200 credits · minimum $10.00
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSaveAutoRecharge(autoRecharge?.is_enabled ?? false)}
                    disabled={
                      autoSaving ||
                      autoLoading ||
                      topupCredits < 2000 ||
                      (monthlyCapDollars.trim() !== '' &&
                        Number.parseInt(monthlyCapDollars, 10) < 10)
                    }
                    className="button-glass-accent w-full rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                  >
                    {autoSaving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
