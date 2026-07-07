'use client'

import type {
  BillingStatusResponse,
  Invoice,
  SubscriptionPlan,
} from '@/features/settings/types/billing.types'
import { InvoicesTab } from '../InvoicesTab'
import { PackageTab } from '../PackageTab'
import { PlansTab } from '../PlansTab'
import type { BillingTabType } from '../types'

export function BillingTabsSection({
  activeTab,
  onTabChange,
  plans,
  planSlug,
  status,
  invoices,
  invoicesLoading,
  isAnnual,
  onToggleAnnual,
  onSelectPlan,
  checkoutLoading,
  onCancelSubscription,
  onManageSubscription,
  portalLoading,
}: {
  activeTab: BillingTabType
  onTabChange: (tab: BillingTabType) => void
  plans: SubscriptionPlan[]
  planSlug: string
  status: BillingStatusResponse | null
  invoices: Invoice[]
  invoicesLoading: boolean
  isAnnual: boolean
  onToggleAnnual: () => void
  onSelectPlan: (
    slug: string,
    name: string,
    credits: number,
    monthlyPrice: number,
    direction: 'upgrade' | 'downgrade',
  ) => void
  checkoutLoading: string | null
  onCancelSubscription: () => void
  onManageSubscription: () => void
  portalLoading: boolean
}) {
  return (
    <div className="space-y-spacing-6">
      <div className="flex justify-end">
        <div className="tabs-liquid-glass">
          {[
            { id: 'plans' as const, label: 'Plans' },
            { id: 'invoices' as const, label: 'Invoices' },
            { id: 'package' as const, label: 'Package' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              data-state={activeTab === tab.id ? 'active' : 'inactive'}
              data-variant="liquid"
              className="tabs-liquid-glass-trigger px-spacing-4"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="surface-card rounded-spacing-2 p-spacing-4">
        {activeTab === 'plans' && (
          <PlansTab
            plans={plans}
            currentSlug={planSlug}
            currentPlanName={status?.plan?.name ?? 'Free'}
            currentCredits={status?.plan?.base_credits ?? 0}
            currentMonthlyPrice={
              status?.plan
                ? status.plan.interval === 'year'
                  ? Math.ceil(status.plan.price_amount / 100 / 12)
                  : Math.round(status.plan.price_amount / 100)
                : 0
            }
            isAnnual={isAnnual}
            onToggleAnnual={onToggleAnnual}
            onSelect={onSelectPlan}
            checkoutLoading={checkoutLoading}
            autoRechargeEnabled={status?.autoRecharge?.is_enabled ?? false}
          />
        )}

        {activeTab === 'invoices' && <InvoicesTab invoices={invoices} loading={invoicesLoading} />}

        {activeTab === 'package' && (
          <PackageTab
            status={status}
            onUpgrade={() => onTabChange('plans')}
            onCancel={onCancelSubscription}
            onManage={onManageSubscription}
            portalLoading={portalLoading}
          />
        )}
      </div>
    </div>
  )
}
