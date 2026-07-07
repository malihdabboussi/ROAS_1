'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getBillingStatus } from '@/lib/billing/billing-api'
import { CreditPurchaseSuccessDialog } from './CreditPurchaseSuccessDialog'

/**
 * PurchaseSuccessHandler
 *
 * Detects ?credits=purchased in the URL (after Stripe Checkout redirect)
 * and shows the animated "Credits Added!" dialog.
 *
 * 1:1 port of legacy PurchaseSuccessHandler behavior.
 */
export function PurchaseSuccessHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [showSuccess, setShowSuccess] = useState(false)
  const [totalCredits, setTotalCredits] = useState(0)

  useEffect(() => {
    if (searchParams.get('credits') !== 'purchased') return

    // Fetch current balance to show in the success dialog
    async function loadBalance() {
      try {
        const data = await getBillingStatus()
        if (data.balance) {
          setTotalCredits(data.balance.totalAvailable)
        }
      } catch {
        // Show dialog anyway even if balance fetch fails
      }
      setShowSuccess(true)
    }

    void loadBalance()
  }, [searchParams])

  const handleClose = () => {
    setShowSuccess(false)
    // Remove the query param from URL without navigation
    const params = new URLSearchParams(searchParams.toString())
    params.delete('credits')
    params.delete('canceled')
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
    router.replace(newUrl, { scroll: false })
  }

  return (
    <CreditPurchaseSuccessDialog
      open={showSuccess}
      onClose={handleClose}
      previousCredits={0}
      currentCredits={totalCredits}
    />
  )
}
