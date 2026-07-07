'use client'

import { PurchaseSuccessHandler } from '@/features/billing/components/PurchaseSuccessHandler'
import { PlanChangeConfirmDialog } from './dialogs/PlanChangeConfirmDialog'
import { useBillingPage } from './hooks/useBillingPage'
import { BillingAlertsSection } from './sections/BillingAlertsSection'
import { BillingFatalErrorView } from './sections/BillingFatalErrorView'
import { BillingLoadingView } from './sections/BillingLoadingView'
import { BillingTabsSection } from './sections/BillingTabsSection'

export function BillingPageContent() {
  const {
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
  } = useBillingPage()

  if (loading) {
    return <BillingLoadingView />
  }

  if (error && !status) {
    return <BillingFatalErrorView error={error} onRetry={loadData} />
  }

  return (
    <div className="p-spacing-4 md:p-spacing-8">
      <PurchaseSuccessHandler />

      <div className="space-y-spacing-6 max-w-5xl">
        <BillingAlertsSection
          error={error}
          hasStatus={!!status}
          onDismissError={() => setError(null)}
          isCanceled={isCanceled}
          subscription={subscription}
          onReactivate={handleReactivate}
          onManageSubscription={handleManageSubscription}
          portalLoading={portalLoading}
        />

        <BillingTabsSection
          activeTab={activeTab}
          onTabChange={setActiveTab}
          plans={plans}
          planSlug={planSlug}
          status={status}
          invoices={invoices}
          invoicesLoading={invoicesLoading}
          isAnnual={isAnnual}
          onToggleAnnual={() => setIsAnnual(!isAnnual)}
          onSelectPlan={handleSelectPlan}
          checkoutLoading={checkoutLoading}
          onCancelSubscription={handleCancelSubscription}
          onManageSubscription={handleManageSubscription}
          portalLoading={portalLoading}
        />
      </div>

      <PlanChangeConfirmDialog
        pendingPlanChange={pendingPlanChange}
        status={status}
        onDismiss={() => setPendingPlanChange(null)}
        onConfirm={handleConfirmPlanChange}
      />
    </div>
  )
}

export default BillingPageContent
