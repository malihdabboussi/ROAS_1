import type {
  CampaignStripeOverview,
  StripeCoupon,
  StripePaymentLink,
  StripePrice,
  StripeProduct,
} from '@/features/studio/services/analytics.service'

export type TimeRange = '7d' | '30d' | '90d' | 'all'

export interface ProductWithPrices extends StripeProduct {
  prices?: StripePrice[]
  pricesLoading?: boolean
}

export interface CampaignFinanceDataState {
  overview: CampaignStripeOverview | null
  overviewLoading: boolean
  products: ProductWithPrices[]
  paymentLinks: StripePaymentLink[]
  coupons: StripeCoupon[]
  objectsLoading: boolean
  pricesStillLoading: boolean
  initialLoading: boolean
  currency: string
  newLinkPriceOptions: Array<{ priceId: string; label: string }>
}
