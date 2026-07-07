import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { PaypalIntegration } from '../integrations/paypal.integration'
import { PaypalOAuthService } from './paypal-oauth.service'

function defaultSearchWindow(): { start: string; end: string } {
  const end = new Date()
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

@Injectable()
export class PaypalApiService {
  constructor(
    private readonly oauth: PaypalOAuthService,
    private readonly paypal: PaypalIntegration,
  ) {}

  async searchTransactions(
    supabase: SupabaseClient,
    userId: string,
    params: {
      start_date: string
      end_date: string
      transaction_id?: string
      transaction_status?: string
      transaction_type?: string
      fields?: string
      page?: number
      page_size?: number
    },
  ): Promise<unknown> {
    const accessToken = await this.oauth.getValidAccessToken(supabase, userId)
    const q: Record<string, string | undefined> = {
      start_date: params.start_date,
      end_date: params.end_date,
      transaction_id: params.transaction_id,
      transaction_status: params.transaction_status,
      transaction_type: params.transaction_type,
      fields: params.fields,
      page: params.page != null ? String(params.page) : undefined,
      page_size: params.page_size != null ? String(params.page_size) : undefined,
    }
    return this.paypal.searchTransactions(accessToken, q)
  }

  async getTransactionById(
    supabase: SupabaseClient,
    userId: string,
    transactionId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<unknown> {
    const accessToken = await this.oauth.getValidAccessToken(supabase, userId)
    const win = defaultSearchWindow()
    const start_date = startDate ?? win.start
    const end_date = endDate ?? win.end
    return this.paypal.searchTransactions(accessToken, {
      start_date,
      end_date,
      transaction_id: transactionId,
    })
  }

  async getBalances(
    supabase: SupabaseClient,
    userId: string,
    asOfTime?: string,
    currencyCode?: string,
  ): Promise<unknown> {
    const accessToken = await this.oauth.getValidAccessToken(supabase, userId)
    return this.paypal.getBalances(accessToken, asOfTime, currencyCode)
  }
}
