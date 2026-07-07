import { z } from 'zod'

export const StartPayPalConnectSchema = z.object({
  redirectTo: z.string().min(1, 'redirectTo is required'),
  connection_scope: z.enum(['personal', 'org_shared']).optional(),
})

/** PayPal Transaction Search: start_date and end_date RFC3339, max 31-day window */
export const PayPalTransactionSearchQuerySchema = z.object({
  start_date: z.string().min(1, 'start_date is required (RFC3339)'),
  end_date: z.string().min(1, 'end_date is required (RFC3339)'),
  transaction_id: z.string().optional(),
  transaction_status: z.string().optional(),
  transaction_type: z.string().optional(),
  fields: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  page_size: z.coerce.number().int().min(1).max(500).optional(),
})

export const PayPalTransactionByIdQuerySchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
})
