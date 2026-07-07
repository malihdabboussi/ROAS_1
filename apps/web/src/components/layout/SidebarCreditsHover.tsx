'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { BadgeDollarSign, ChevronRight } from 'lucide-react'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { billingApi } from '@/lib/billing/billing-api'
import type { BillingStatusResponse } from '@/lib/billing/billing.types'

function formatFull(n: number): string {
  return n.toLocaleString('en-US')
}

function formatCompact(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return formatFull(n)
}

type HqTriggerLayout = 'rail' | 'row'

export function SidebarCreditsHover({
  variant,
  collapsed = false,
  hqTriggerLayout = 'rail',
  compactStudioTrigger = false,
}: {
  variant: 'studio' | 'hq'
  collapsed?: boolean
  hqTriggerLayout?: HqTriggerLayout
  /** When studio + expanded: don’t stretch full width (e.g. footer row beside avatar) */
  compactStudioTrigger?: boolean
}) {
  const storeBalance = useChatStore((s) => s.creditBalance)
  const setStoreCreditBalance = useChatStore((s) => s.setCreditBalance)
  const [open, setOpen] = React.useState(false)
  const [status, setStatus] = React.useState<BillingStatusResponse | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [initialFetched, setInitialFetched] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const panelRef = React.useRef<HTMLDivElement>(null)
  const [pos, setPos] = React.useState({ top: 0, left: 0 })

  const loadStatus = React.useCallback(
    async (opts?: { force?: boolean }) => {
      setLoading(true)
      try {
        const data = await billingApi.getStatusCached(opts)
        setStatus(data)
        if (data.balance) {
          setStoreCreditBalance({
            totalAvailable: data.balance.totalAvailable,
            totalUsed: data.balance.totalUsed,
            baseCredits: data.balance.baseCredits,
          })
        }
      } catch {
        setStatus(null)
      } finally {
        setLoading(false)
        setInitialFetched(true)
      }
    },
    [setStoreCreditBalance],
  )

  React.useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  React.useEffect(() => {
    // Credits drain as the user works, so the popover always shows fresh numbers.
    if (open) void loadStatus({ force: true })
  }, [open, loadStatus])

  const reposition = React.useCallback(() => {
    const t = triggerRef.current
    const p = panelRef.current
    if (!t || !p) return
    const rect = t.getBoundingClientRect()
    const panelH = p.offsetHeight
    const panelW = p.offsetWidth
    const isMobile = window.matchMedia('(max-width: 767px)').matches
    const pad = 8
    if (isMobile) {
      let left = rect.left + rect.width / 2 - panelW / 2
      left = Math.max(pad, Math.min(left, window.innerWidth - panelW - pad))
      let top = rect.top - panelH - pad
      if (top < pad) top = rect.bottom + pad
      setPos({ top, left })
    } else {
      let top = rect.bottom - panelH
      top = Math.max(pad, Math.min(top, window.innerHeight - panelH - pad))
      let left = rect.right + 8
      if (left + panelW > window.innerWidth - pad) left = rect.left - panelW - 8
      setPos({ top, left })
    }
  }, [])

  React.useLayoutEffect(() => {
    if (!open) return
    const raf = requestAnimationFrame(() => reposition())
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open, status, loading, reposition])

  React.useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const el = e.target as Node
      if (triggerRef.current?.contains(el)) return
      if (panelRef.current?.contains(el)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const balanceKnown = status?.balance != null || (initialFetched && storeBalance != null)
  const displayTotal = status?.balance.totalAvailable ?? storeBalance?.totalAvailable ?? 0

  const openUsage = React.useCallback(() => {
    setOpen(false)
    window.dispatchEvent(new CustomEvent('open-account-settings', { detail: 'usage' }))
  }, [])

  const openPurchase = React.useCallback(() => {
    setOpen(false)
    window.dispatchEvent(new CustomEvent('open-credit-purchase'))
  }, [])

  const onTriggerClick = () => {
    setOpen((o) => !o)
  }

  const balance = status?.balance
  const planName = status?.plan?.name ?? 'Free'
  const monthlyRemaining = balance ? Math.max(0, balance.baseCredits - balance.baseCreditsUsed) : 0
  const monthlyCap = balance?.baseCredits ?? 0
  const rollover = balance?.rolloverCredits ?? 0
  const addonRemaining = balance
    ? Math.max(0, balance.purchasedCredits - balance.purchasedCreditsUsed)
    : 0

  const creditIconClass = 'icon-md shrink-0'

  const triggerButton =
    variant === 'studio' && !collapsed ? (
      <button
        ref={triggerRef}
        type="button"
        onClick={onTriggerClick}
        className={`nav-glass-hover-purple px-spacing-2 py-spacing-2 flex items-center justify-between rounded-lg text-[var(--color-foreground)] transition-all ${
          compactStudioTrigger ? 'w-auto max-w-[11rem] shrink-0' : 'w-full'
        }`}
      >
        <span className="gap-spacing-2 flex items-center">
          <BadgeDollarSign className={`${creditIconClass} text-[var(--color-muted-foreground)]`} />
          {balanceKnown ? (
            <span className="body-2 font-medium">{formatCompact(displayTotal)}</span>
          ) : (
            <span className="inline-block h-4 w-10 animate-pulse rounded bg-[var(--color-secondary)]" />
          )}
        </span>
        <ChevronRight className={`${creditIconClass} text-[var(--color-muted-foreground)]`} />
      </button>
    ) : variant === 'studio' && collapsed ? (
      <button
        ref={triggerRef}
        type="button"
        onClick={onTriggerClick}
        aria-label={balanceKnown ? `Credits: ${formatFull(displayTotal)}` : 'Credits'}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-secondary)] hover:text-[var(--color-foreground)]"
      >
        <BadgeDollarSign className={creditIconClass} />
      </button>
    ) : hqTriggerLayout === 'row' ? (
      <button
        ref={triggerRef}
        type="button"
        onClick={onTriggerClick}
        className="nav-glass-hover-purple flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[var(--color-muted-foreground)] transition-all"
      >
        <BadgeDollarSign className={creditIconClass} />
        <span className="body-2">Credits</span>
        {balanceKnown ? (
          <span className="body-3 ml-auto text-[var(--color-muted-foreground)]">
            {formatCompact(displayTotal)}
          </span>
        ) : (
          <span className="ml-auto inline-block h-3.5 w-8 animate-pulse rounded bg-[var(--color-secondary)]" />
        )}
      </button>
    ) : (
      <button
        ref={triggerRef}
        type="button"
        onClick={onTriggerClick}
        className="group flex w-full flex-col items-center gap-1.5 px-1 py-2 transition-all"
      >
        <span className="flex items-center justify-center rounded-lg border border-transparent p-1.5 text-[var(--color-muted-foreground)] transition-all group-hover:text-[var(--color-foreground)]">
          <BadgeDollarSign className={creditIconClass} />
        </span>
        <span className="text-[10px] leading-tight text-[var(--color-muted-foreground)] transition-colors group-hover:text-[var(--color-foreground)]">
          Credits
        </span>
      </button>
    )

  const panel =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={panelRef}
            data-sidebar-credits-panel
            className="border-border bg-card text-card-foreground rounded-spacing-2 fixed z-[1000] w-72 overflow-hidden border shadow-lg"
            style={{ top: pos.top, left: pos.left }}
          >
            <div className="card-glass rounded-spacing-2 p-spacing-3">
              <div className="mb-spacing-3 gap-spacing-2 pb-spacing-3 flex items-start justify-between border-b border-dashed border-[var(--color-border)]">
                {loading && !status ? (
                  <span className="inline-block h-5 w-16 animate-pulse rounded bg-[var(--color-secondary)]" />
                ) : (
                  <span className="title-h4 text-card-foreground leading-tight">{planName}</span>
                )}
                <button
                  type="button"
                  onClick={openPurchase}
                  className="button-glass-gold body-3 rounded-spacing-1 px-spacing-2 py-spacing-1 shrink-0 font-medium"
                >
                  Add credits
                </button>
              </div>

              {loading && !balance ? (
                <div className="space-y-spacing-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="body-2 text-card-foreground flex items-center gap-1">
                      <BadgeDollarSign
                        className={`${creditIconClass} text-[var(--color-muted-foreground)]`}
                      />
                      Credits
                    </span>
                    <span className="inline-block h-4 w-12 animate-pulse rounded bg-[var(--color-secondary)]" />
                  </div>
                  <div className="body-3 space-y-spacing-1 pl-1 text-[var(--color-muted-foreground)]">
                    <div className="flex items-center justify-between gap-2">
                      <span>Rollover</span>
                      <span className="inline-block h-3 w-8 animate-pulse rounded bg-[var(--color-secondary)]" />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>Monthly credits</span>
                      <span className="inline-block h-3 w-14 animate-pulse rounded bg-[var(--color-secondary)]" />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>Add-on credits</span>
                      <span className="inline-block h-3 w-8 animate-pulse rounded bg-[var(--color-secondary)]" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-spacing-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="body-2 text-card-foreground flex items-center gap-1">
                      <BadgeDollarSign
                        className={`${creditIconClass} text-[var(--color-muted-foreground)]`}
                      />
                      Credits
                    </span>
                    <span className="body-2 text-card-foreground font-semibold">
                      {formatFull(balance?.totalAvailable ?? displayTotal)}
                    </span>
                  </div>

                  <div className="body-3 space-y-spacing-1 pl-1 text-[var(--color-muted-foreground)]">
                    <div className="flex items-center justify-between gap-2">
                      <span>Rollover</span>
                      <span>{formatFull(rollover)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>Monthly credits</span>
                      <span>
                        {formatFull(monthlyRemaining)} / {formatFull(monthlyCap)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>Add-on credits</span>
                      <span>{formatFull(addonRemaining)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={openUsage}
              className="body-3 px-spacing-3 py-spacing-2 flex w-full items-center justify-between text-left text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-secondary)] hover:text-[var(--color-foreground)]"
            >
              View usage
              <ChevronRight className={creditIconClass} />
            </button>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      {triggerButton}
      {panel}
    </>
  )
}
