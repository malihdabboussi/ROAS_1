export type BillingTabType = 'plans' | 'invoices' | 'package'

export type PendingPlanChange = {
  slug: string
  name: string
  credits: number
  monthlyPrice: number
  direction: 'upgrade' | 'downgrade'
}
