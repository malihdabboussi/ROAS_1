import { z } from 'zod'

export const StartStripeConnectSchema = z.object({
  redirectTo: z.string().min(1, 'redirectTo is required'),
  connection_scope: z.enum(['personal', 'org_shared']).optional(),
})

export const CreateStripeProductSchema = z.object({
  name: z.string().min(1, 'name is required'),
  description: z.string().optional(),
  images: z.array(z.string().url()).max(8).optional(),
  url: z.string().url().optional(),
  shippable: z.boolean().optional(),
  unit_label: z.string().max(12).optional(),
  tax_code: z.string().optional(),
  active: z.boolean().default(true).optional(),
  statement_descriptor: z.string().max(22).optional(),
  default_price_data: z
    .object({
      currency: z.string().min(3).max(3),
      unit_amount: z.number().int().positive(),
      recurring: z
        .object({
          interval: z.enum(['day', 'week', 'month', 'year']),
          interval_count: z.number().int().positive().optional(),
        })
        .optional(),
    })
    .optional(),
  campaign_id: z.string().uuid().optional(),
  campaign_name: z.string().min(1).optional(),
  metadata: z.record(z.string()).optional(),
})

export const CreateStripePriceSchema = z.object({
  product: z.string().min(1, 'product is required'),
  currency: z.string().min(3).max(3),
  unit_amount: z.number().int().positive(),
  recurring: z
    .object({
      interval: z.enum(['day', 'week', 'month', 'year']),
      interval_count: z.number().int().positive().optional(),
    })
    .optional(),
  nickname: z.string().optional(),
  active: z.boolean().default(true).optional(),
  billing_scheme: z.enum(['per_unit', 'tiered']).optional(),
  tax_behavior: z.enum(['inclusive', 'exclusive', 'unspecified']).optional(),
  lookup_key: z.string().max(200).optional(),
  campaign_id: z.string().uuid().optional(),
  campaign_name: z.string().min(1).optional(),
  metadata: z.record(z.string()).optional(),
})

export const CreateStripePaymentLinkSchema = z
  .object({
    price: z.string().min(1, 'price is required'),
    quantity: z.number().int().positive().default(1),
    trial_period_days: z.number().int().min(0).max(90).optional(),
    after_completion_type: z.enum(['redirect', 'hosted_confirmation']).optional(),
    after_completion_url: z.string().url().optional(),
    custom_fields: z
      .array(
        z.object({
          key: z.string().min(1),
          label: z.object({ type: z.literal('custom'), custom: z.string().min(1) }),
          type: z.enum(['text', 'numeric', 'dropdown']),
          optional: z.boolean().optional(),
        }),
      )
      .optional(),
    campaign_id: z.string().uuid().optional(),
    campaign_name: z.string().min(1).optional(),
    metadata: z.record(z.string()).optional(),
  })
  .refine((d) => !(d.after_completion_type === 'redirect' && !d.after_completion_url), {
    message: 'after_completion_url is required when after_completion_type is redirect',
    path: ['after_completion_url'],
  })

export const CreateStripeRefundSchema = z.object({
  charge: z.string().min(1, 'charge is required'),
  amount: z.number().int().positive().optional(),
  reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']).optional(),
  campaign_id: z.string().uuid().optional(),
  campaign_name: z.string().min(1).optional(),
  metadata: z.record(z.string()).optional(),
})

export const CreateStripeCouponSchema = z
  .object({
    id: z.string().min(1).max(40).optional(),
    name: z.string().min(1).max(40).optional(),
    percent_off: z.number().gt(0).lte(100).optional(),
    amount_off: z.number().int().positive().optional(),
    currency: z.string().length(3).optional(),
    duration: z.enum(['once', 'forever', 'repeating']).default('once'),
    duration_in_months: z.number().int().positive().optional(),
    max_redemptions: z.number().int().positive().optional(),
    redeem_by: z.number().int().positive().optional(),
    campaign_id: z.string().uuid().optional(),
    campaign_name: z.string().min(1).optional(),
    metadata: z.record(z.string()).optional(),
  })
  .refine((d) => !!(d.percent_off || d.amount_off), {
    message: 'Either percent_off or amount_off is required',
  })
  .refine((d) => !(d.amount_off && !d.currency), {
    message: 'currency is required when amount_off is set',
    path: ['currency'],
  })
  .refine((d) => !(d.duration === 'repeating' && !d.duration_in_months), {
    message: 'duration_in_months is required when duration is repeating',
    path: ['duration_in_months'],
  })

export const StripeCampaignIdQuerySchema = z.object({
  campaign_id: z.string().uuid('campaign_id must be a valid UUID'),
})

export const StripeCampaignOverviewQuerySchema = z.object({
  campaign_id: z.string().uuid('campaign_id must be a valid UUID'),
  from: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .refine((v) => v === undefined || Number.isFinite(v), 'from must be a unix timestamp'),
  to: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .refine((v) => v === undefined || Number.isFinite(v), 'to must be a unix timestamp'),
})
