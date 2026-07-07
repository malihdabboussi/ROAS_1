import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchCampaignStripeCoupons,
  fetchCampaignStripeOverview,
  fetchCampaignStripePaymentLinks,
  fetchCampaignStripeProducts,
  fetchStripeProductPrices,
} from '@/features/studio/services/analytics.service'
import type { ProductWithPrices, TimeRange } from '../types'
import { fmtPrice } from '../utils/financeFormatters'
import { getRangeUnix } from '../utils/timeRange'

export function useCampaignFinanceData(campaignId: string, timeRange: TimeRange) {
  const [overview, setOverview] = useState<Awaited<
    ReturnType<typeof fetchCampaignStripeOverview>
  > | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [products, setProducts] = useState<ProductWithPrices[]>([])
  const [paymentLinks, setPaymentLinks] = useState<
    Awaited<ReturnType<typeof fetchCampaignStripePaymentLinks>>['data']
  >([])
  const [coupons, setCoupons] = useState<
    Awaited<ReturnType<typeof fetchCampaignStripeCoupons>>['data']
  >([])
  const [objectsLoading, setObjectsLoading] = useState(true)

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true)
    try {
      const { fromUnix, toUnix } = getRangeUnix(timeRange)
      const data = await fetchCampaignStripeOverview(campaignId, fromUnix, toUnix)
      setOverview(data)
    } catch {
      setOverview(null)
    } finally {
      setOverviewLoading(false)
    }
  }, [campaignId, timeRange])

  const loadObjects = useCallback(async () => {
    setObjectsLoading(true)
    try {
      const [prods, links, coup] = await Promise.all([
        fetchCampaignStripeProducts(campaignId),
        fetchCampaignStripePaymentLinks(campaignId),
        fetchCampaignStripeCoupons(campaignId),
      ])
      setProducts(prods.data ?? [])
      setPaymentLinks(links.data ?? [])
      setCoupons(coup.data ?? [])
    } catch {
      setProducts([])
      setPaymentLinks([])
      setCoupons([])
    } finally {
      setObjectsLoading(false)
    }
  }, [campaignId])

  const refreshObjectsSilently = useCallback(async () => {
    try {
      const [prods, links, coup] = await Promise.all([
        fetchCampaignStripeProducts(campaignId),
        fetchCampaignStripePaymentLinks(campaignId),
        fetchCampaignStripeCoupons(campaignId),
      ])
      setProducts((prev) => {
        const fresh = prods.data ?? []
        return fresh.map((p) => {
          const existing = prev.find((e) => e.id === p.id)
          return existing
            ? { ...p, prices: existing.prices, pricesLoading: existing.pricesLoading }
            : p
        })
      })
      setPaymentLinks(links.data ?? [])
      setCoupons(coup.data ?? [])
    } catch {
      // keep current state on silent refresh failure
    }
  }, [campaignId])

  const expandProductPrices = useCallback(async (productId: string) => {
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, pricesLoading: true } : p)))
    try {
      const result = await fetchStripeProductPrices(productId)
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, prices: result.data, pricesLoading: false } : p,
        ),
      )
    } catch {
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, pricesLoading: false } : p)),
      )
    }
  }, [])

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])

  useEffect(() => {
    void loadObjects()
  }, [loadObjects])

  useEffect(() => {
    const withoutPrices = products.filter((p) => (!p.prices && !p.pricesLoading) || p.pricesLoading)
    withoutPrices.forEach((p) => {
      if (!p.prices && !p.pricesLoading) void expandProductPrices(p.id)
    })
  }, [products, expandProductPrices])

  const newLinkPriceOptions = useMemo(() => {
    return products.flatMap((p) =>
      (p.prices ?? []).map((price) => ({
        priceId: price.id,
        label: `${p.name} — ${fmtPrice(price)}`,
      })),
    )
  }, [products])

  const pricesStillLoading =
    !objectsLoading &&
    products.length > 0 &&
    products.some((p) => (!p.prices && !p.pricesLoading) || p.pricesLoading)
  const initialLoading = objectsLoading || overviewLoading || pricesStillLoading
  const currency = overview?.currency ?? 'usd'

  return {
    overview,
    overviewLoading,
    products,
    setProducts,
    paymentLinks,
    setPaymentLinks,
    coupons,
    setCoupons,
    objectsLoading,
    initialLoading,
    currency,
    newLinkPriceOptions,
    loadOverview,
    refreshObjectsSilently,
    expandProductPrices,
  }
}
