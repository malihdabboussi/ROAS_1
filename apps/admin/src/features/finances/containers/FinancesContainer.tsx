'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Brain, CreditCard, Package } from 'lucide-react'
import { BillingScopeSelect } from '@/components/admin/BillingScopeSelect'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BillingHealthTab } from '../components/BillingHealthTab'
import { CostTrendsChart } from '../components/CostTrendsChart'
import { DateRangePicker } from '../components/DateRangePicker'
import { FinanceSummaryCards } from '../components/FinanceSummaryCards'
import { ProfitabilityGauges } from '../components/ProfitabilityGauges'
import { RevenueVsCostsChart } from '../components/RevenueVsCostsChart'
import { fetchFinances } from '../services/finances.service'
import type { AdminBillingScope, FinancesData } from '../types/finances.types'

function fmt(n: number) {
  return `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function FinancesContainer() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<FinancesData | null>(null)
  const [activeDays, setActiveDays] = useState('30')
  const [billingScope, setBillingScope] = useState<AdminBillingScope>('all')
  const [customFrom, setCustomFrom] = useState<string | undefined>()
  const [customTo, setCustomTo] = useState<string | undefined>()
  const isCustom = useRef(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = isCustom.current
        ? { from: customFrom, to: customTo, scope: billingScope }
        : { days: activeDays, scope: billingScope }
      const result = await fetchFinances(params)
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load finances')
    } finally {
      setLoading(false)
    }
  }, [activeDays, customFrom, customTo, billingScope])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handlePresetChange = useCallback((days: string) => {
    isCustom.current = false
    setCustomFrom(undefined)
    setCustomTo(undefined)
    setActiveDays(days)
  }, [])

  const handleCustomChange = useCallback((from: string, to: string) => {
    isCustom.current = true
    setActiveDays('custom')
    setCustomFrom(from)
    setCustomTo(to)
  }, [])

  const rangeDaysLabel = data
    ? `Last ${data.rangeDays} day${data.rangeDays !== 1 ? 's' : ''}`
    : null

  return (
    <div className="space-y-spacing-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="title-h1 text-foreground">FINANCES</h1>
          <p className="body-2 text-muted-foreground mt-spacing-2">
            Track revenue, costs, and profitability across subscriptions, addons, and credit packs
            {rangeDaysLabel && !loading ? ` — ${rangeDaysLabel}` : ''}
          </p>
        </div>
        <div className="gap-spacing-3 flex flex-wrap items-center justify-end">
          <BillingScopeSelect value={billingScope} onChange={setBillingScope} />
          <DateRangePicker
            activeDays={activeDays}
            customFrom={customFrom}
            customTo={customTo}
            onPresetChange={handlePresetChange}
            onCustomChange={handleCustomChange}
          />
        </div>
      </div>

      <FinanceSummaryCards
        summary={data?.summary ?? null}
        profitability={data?.profitability ?? null}
        loading={loading}
        error={error}
      />

      <Tabs defaultValue="overview" className="space-y-spacing-6">
        <TabsList variant="liquid" className="ml-auto">
          <TabsTrigger value="overview" className="px-spacing-4">
            Overview
          </TabsTrigger>
          <TabsTrigger value="revenue" className="px-spacing-4">
            Revenue
          </TabsTrigger>
          <TabsTrigger value="costs" className="px-spacing-4">
            Costs
          </TabsTrigger>
          <TabsTrigger value="profitability" className="px-spacing-4">
            Profitability
          </TabsTrigger>
          <TabsTrigger value="addons" className="px-spacing-4">
            Addons & Credits
          </TabsTrigger>
          <TabsTrigger value="billing-health" className="px-spacing-4">
            Billing Health
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          <div className="space-y-spacing-6">
            <div className="gap-spacing-6 grid grid-cols-1 lg:grid-cols-2">
              <RevenueVsCostsChart
                costTrend={data?.costTrend30d ?? []}
                revenueTrend={data?.revenueTrend30d ?? []}
                loading={loading}
              />
              <CostTrendsChart data={data?.costTrend30d ?? []} loading={loading} />
            </div>

            <div className="gap-spacing-6 grid grid-cols-1 lg:grid-cols-2">
              <Card className="card-glass p-spacing-6">
                <h3 className="title-h4 text-foreground mb-spacing-4">Revenue Breakdown</h3>
                <div className="space-y-spacing-3">
                  <div className="flex items-center justify-between">
                    <span className="body-2 text-muted-foreground">MRR (Subscriptions)</span>
                    <span className="title-h5 text-foreground">
                      {data ? fmt(data.summary.mrr) : '...'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="body-2 text-muted-foreground">ARR</span>
                    <span className="title-h5 text-foreground">
                      {data ? fmt(data.summary.arr) : '...'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="body-2 text-muted-foreground">Addons</span>
                    <span className="title-h5 text-foreground">
                      {data ? fmt(data.summary.addonMrr) : '...'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="body-2 text-muted-foreground">Credit Packs</span>
                    <span className="title-h5 text-foreground">
                      {data ? fmt(data.summary.creditPackRevenue) : '...'}
                    </span>
                  </div>
                </div>
              </Card>
              <Card className="card-glass p-spacing-6">
                <h3 className="title-h4 text-foreground mb-spacing-4">Cost Breakdown</h3>
                <div className="space-y-spacing-3">
                  <div className="flex items-center justify-between">
                    <span className="body-2 text-muted-foreground">Total Cost (30d)</span>
                    <span className="title-h5 text-foreground">
                      {data ? fmt(data.summary.totalCost30d) : '...'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="body-2 text-muted-foreground">AI Requests</span>
                    <span className="title-h5 text-foreground">
                      {data ? data.summary.totalRequests30d.toLocaleString() : '...'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="body-2 text-muted-foreground">Avg Daily Cost</span>
                    <span className="title-h5 text-foreground">
                      {data ? fmt(data.summary.avgDailyCost) : '...'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="body-2 text-muted-foreground">Credits Used</span>
                    <span className="title-h5 text-foreground">
                      {data ? data.summary.totalCredits30d.toLocaleString() : '...'}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Revenue */}
        <TabsContent value="revenue">
          <div className="space-y-spacing-6">
            <Card className="card-glass p-spacing-6">
              <h3 className="title-h4 text-foreground mb-spacing-4">Plan Breakdown</h3>
              {data && data.planBreakdown.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-border bg-muted/30 border-b">
                        <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                          Plan
                        </th>
                        <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                          {data?.scope === 'organization' ? 'Orgs' : 'Accounts'}
                        </th>
                        <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                          MRR
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.planBreakdown.map((row) => (
                        <tr key={row.plan} className="border-border border-t">
                          <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                            {row.plan}
                          </td>
                          <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                            {row.count}
                          </td>
                          <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                            {fmt(row.mrr)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="body-3 text-muted-foreground">
                  {loading ? 'Loading...' : 'No plans data'}
                </p>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Costs */}
        <TabsContent value="costs">
          <div className="space-y-spacing-6">
            <CostTrendsChart data={data?.costTrend30d ?? []} loading={loading} />
            <Card className="card-glass p-spacing-6">
              <h3 className="title-h4 text-foreground mb-spacing-4">Feature Cost Breakdown</h3>
              {data && data.featureBreakdown.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-border bg-muted/30 border-b">
                        <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                          Feature
                        </th>
                        <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                          Requests
                        </th>
                        <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                          Credits
                        </th>
                        <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                          Avg/Req
                        </th>
                        <th className="px-spacing-3 py-spacing-2 body-4 text-muted-foreground text-left font-medium">
                          Total Cost
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.featureBreakdown.map((row) => (
                        <tr key={row.feature} className="border-border border-t">
                          <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                            {row.feature}
                          </td>
                          <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                            {row.requests.toLocaleString()}
                          </td>
                          <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                            {row.credits.toLocaleString()}
                          </td>
                          <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                            ${row.avgPerRequest.toFixed(4)}
                          </td>
                          <td className="px-spacing-3 py-spacing-2 body-3 text-foreground">
                            {fmt(row.totalCost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="body-3 text-muted-foreground">
                  {loading ? 'Loading...' : 'No cost data'}
                </p>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Profitability */}
        <TabsContent value="profitability">
          <div className="space-y-spacing-6">
            <Card className="card-glass p-spacing-6">
              <h3 className="title-h4 text-foreground mb-spacing-4">Unit Economics</h3>
              <div className="gap-spacing-4 grid grid-cols-1 md:grid-cols-3">
                <div className="p-spacing-4 border-border rounded-spacing-2 border">
                  <p className="body-3 text-muted-foreground mb-spacing-1">Revenue per Customer</p>
                  <p className="title-h3 text-emerald">
                    {data ? fmt(data.profitability.revenuePerCustomer) : '...'}
                  </p>
                </div>
                <div className="p-spacing-4 border-border rounded-spacing-2 border">
                  <p className="body-3 text-muted-foreground mb-spacing-1">Cost per Customer</p>
                  <p className="title-h3 text-orange">
                    {data ? fmt(data.profitability.costPerCustomer) : '...'}
                  </p>
                </div>
                <div className="p-spacing-4 border-border rounded-spacing-2 border">
                  <p className="body-3 text-muted-foreground mb-spacing-1">Profit per Customer</p>
                  <p
                    className={`title-h3 ${data && data.profitability.profitPerCustomer >= 0 ? 'text-emerald' : 'text-destructive'}`}
                  >
                    {data
                      ? `${data.profitability.profitPerCustomer < 0 ? '-' : ''}${fmt(data.profitability.profitPerCustomer)}`
                      : '...'}
                  </p>
                </div>
              </div>
            </Card>
            <ProfitabilityGauges profitability={data?.profitability ?? null} loading={loading} />
          </div>
        </TabsContent>

        {/* Addons & Credits */}
        <TabsContent value="addons">
          <div className="space-y-spacing-6">
            <div className="gap-spacing-6 grid grid-cols-1 md:grid-cols-2">
              <Card className="card-glass p-spacing-6">
                <div className="gap-spacing-3 mb-spacing-4 flex items-center">
                  <Brain className="icon-sm text-foreground" />
                  <h3 className="title-h4 text-foreground">Addons (Agent Brains)</h3>
                </div>
                <div className="space-y-spacing-4">
                  <div className="flex items-center justify-between">
                    <span className="body-2 text-muted-foreground">Active Addons</span>
                    <span className="title-h3 text-foreground">
                      {data?.summary.addonCount ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="body-2 text-muted-foreground">Monthly Revenue</span>
                    <span className="title-h3 text-emerald">
                      {data ? fmt(data.summary.addonMrr) : '...'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="body-2 text-muted-foreground">Per Addon</span>
                    <span className="title-h5 text-muted-foreground">$10.00/mo</span>
                  </div>
                </div>
              </Card>

              <Card className="card-glass p-spacing-6">
                <div className="gap-spacing-3 mb-spacing-4 flex items-center">
                  <CreditCard className="icon-sm text-foreground" />
                  <h3 className="title-h4 text-foreground">Credit Pack Purchases</h3>
                </div>
                <div className="space-y-spacing-4">
                  <div className="flex items-center justify-between">
                    <span className="body-2 text-muted-foreground">Total Purchases</span>
                    <span className="title-h3 text-foreground">
                      {data?.summary.creditPackCount ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="body-2 text-muted-foreground">Total Revenue</span>
                    <span className="title-h3 text-emerald">
                      {data ? fmt(data.summary.creditPackRevenue) : '...'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="body-2 text-muted-foreground">Credits Sold</span>
                    <span className="title-h3 text-foreground">
                      {data?.summary.totalCreditsSold?.toLocaleString() ?? 0}
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="card-glass p-spacing-6">
              <div className="gap-spacing-3 mb-spacing-4 flex items-center">
                <Package className="icon-sm text-foreground" />
                <h3 className="title-h4 text-foreground">Revenue Summary</h3>
              </div>
              <div className="gap-spacing-4 grid grid-cols-1 md:grid-cols-4">
                <div className="p-spacing-4 border-border rounded-spacing-2 border text-center">
                  <p className="body-4 text-muted-foreground mb-spacing-1">Subscriptions</p>
                  <p className="title-h4 text-foreground">{data ? fmt(data.summary.mrr) : '...'}</p>
                  <p className="body-4 text-muted-foreground">
                    {data?.summary.activePaidUsers ?? 0}{' '}
                    {data?.scope === 'organization'
                      ? 'orgs'
                      : data?.scope === 'personal'
                        ? 'users'
                        : 'accounts'}
                  </p>
                </div>
                <div className="p-spacing-4 border-border rounded-spacing-2 border text-center">
                  <p className="body-4 text-muted-foreground mb-spacing-1">Addons</p>
                  <p className="title-h4 text-foreground">
                    {data ? fmt(data.summary.addonMrr) : '...'}
                  </p>
                  <p className="body-4 text-muted-foreground">
                    {data?.summary.addonCount ?? 0} active
                  </p>
                </div>
                <div className="p-spacing-4 border-border rounded-spacing-2 border text-center">
                  <p className="body-4 text-muted-foreground mb-spacing-1">Credit Packs</p>
                  <p className="title-h4 text-foreground">
                    {data ? fmt(data.summary.creditPackRevenue) : '...'}
                  </p>
                  <p className="body-4 text-muted-foreground">
                    {data?.summary.creditPackCount ?? 0} purchases
                  </p>
                </div>
                <div className="p-spacing-4 rounded-spacing-2 card-glass-green text-center">
                  <p className="body-4 text-muted-foreground mb-spacing-1">Total</p>
                  <p className="title-h4 text-emerald">
                    {data ? fmt(data.summary.totalRevenue) : '...'}
                  </p>
                  <p className="body-4 text-muted-foreground">all sources</p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
        {/* Billing Health */}
        <TabsContent value="billing-health">
          <BillingHealthTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
