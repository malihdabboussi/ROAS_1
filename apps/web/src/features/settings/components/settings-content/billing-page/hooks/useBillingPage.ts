'use client'

import { useCallback, useEffect, useState } from 'react'
import { billingApi } from '@/features/settings/services/billing-api'
import type {
  BillingStatusResponse,
  Invoice,
  SubscriptionPlan,
} from '@/features/settings/types/billing.types'
import type { BillingTabType, PendingPlanChange } from '../types'

export function useBillingPage() {
  const [status, setStatus] = useState<BillingStatusResponse | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<BillingTabType>('plans')
  const [isAnnual, setIsAnnual] = useState(false)
  const [pendingPlanChange, setPendingPlanChange] = useState<PendingPlanChange | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [statusData, plansData] = await Promise.all([
        billingApi.getStatus(),
        billingApi.getPlans(),
      ])
      setStatus(statusData)
      setPlans(plansData)
    } catch {
      setError('Failed to load billing information')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (
      activeTab === 'invoices' &&
      invoices.length === 0 &&
      status?.subscription?.stripe_customer_id
    ) {
      setInvoicesLoading(true)
      billingApi
        .getInvoices(12)
        .then(setInvoices)
        .catch(() => {})
        .finally(() => setInvoicesLoading(false))
    }
  }, [activeTab, invoices.length, status?.subscription?.stripe_customer_id])

  const handleManageSubscription = async () => {
    try {
      setPortalLoading(true)
      const { url } = await billingApi.createPortalSession()
      window.location.href = url
    } catch {
      setError('Failed to open billing portal')
      setPortalLoading(false)
    }
  }

  const handleSelectPlan = (
    planSlug: string,
    planName: string,
    credits: number,
    monthlyPrice: number,
    direction: 'upgrade' | 'downgrade',
  ) => {
    const currentSlug = status?.plan?.slug ?? 'free'
    if (planSlug === 'free' || planSlug === currentSlug) return
    setPendingPlanChange({ slug: planSlug, name: planName, credits, monthlyPrice, direction })
  }

  const handleConfirmPlanChange = async () => {
    if (!pendingPlanChange) return
    const { slug } = pendingPlanChange
    setPendingPlanChange(null)
    try {
      setCheckoutLoading(slug)
      const billingPeriod = isAnnual ? 'annual' : 'monthly'
      const result = await billingApi.createCheckout(slug, billingPeriod)

      if ('charged' in result && result.charged) {
        setCheckoutLoading(null)
        await loadData()
      } else if (result.url) {
        window.location.href = result.url
      }
    } catch {
      setError('Failed to start checkout')
      setCheckoutLoading(null)
    }
  }

  const handleCancelSubscription = async () => {
    if (
      !confirm(
        'Are you sure you want to cancel your subscription? You will keep access until the end of your billing period.',
      )
    )
      return
    try {
      await billingApi.cancelSubscription()
      await loadData()
    } catch {
      setError('Failed to cancel subscription')
    }
  }

  const handleReactivate = async () => {
    try {
      await billingApi.reactivateSubscription()
      await loadData()
    } catch {
      setError('Failed to reactivate subscription')
    }
  }

  const planSlug = status?.plan?.slug ?? 'free'
  const subscription = status?.subscription
  const isCanceled = subscription?.cancel_at_period_end

  return {
    status,
    plans,
    invoices,
    loading,
    invoicesLoading,
    portalLoading,
    checkoutLoading,
    error,
    setError,
    activeTab,
    setActiveTab,
    isAnnual,
    setIsAnnual,
    pendingPlanChange,
    setPendingPlanChange,
    loadData,
    handleManageSubscription,
    handleSelectPlan,
    handleConfirmPlanChange,
    handleCancelSubscription,
    handleReactivate,
    planSlug,
    subscription,
    isCanceled,
  }
}
