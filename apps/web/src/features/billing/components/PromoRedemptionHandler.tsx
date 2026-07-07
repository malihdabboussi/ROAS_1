'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { backendPost } from '@/lib/api/backend-client'
import { CreditPurchaseSuccessDialog } from './CreditPurchaseSuccessDialog'

/**
 * PromoRedemptionHandler
 *
 * Detects ?promo=CODE in the URL (after signup redirect)
 * and auto-redeems the promo code to grant credits.
 * Also checks user_metadata.promo_code for email signup flow.
 */
export function PromoRedemptionHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const attempted = useRef(false)

  const [showSuccess, setShowSuccess] = useState(false)
  const [creditsGranted, setCreditsGranted] = useState(0)

  useEffect(() => {
    const promoCode = searchParams.get('promo')
    if (!promoCode || attempted.current) return
    attempted.current = true

    async function redeemPromo() {
      try {
        const result = await backendPost<{ success: boolean; credits: number }>(
          '/api/billing/redeem-promo',
          { code: promoCode },
        )
        if (result.success) {
          setCreditsGranted(result.credits)
          setShowSuccess(true)
        }
      } catch {
        // Silently fail — user may have already redeemed or code invalid
      }
    }

    void redeemPromo()
  }, [searchParams])

  const handleClose = () => {
    setShowSuccess(false)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('promo')
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
    router.replace(newUrl, { scroll: false })
  }

  return (
    <CreditPurchaseSuccessDialog
      open={showSuccess}
      onClose={handleClose}
      previousCredits={0}
      currentCredits={creditsGranted}
    />
  )
}
