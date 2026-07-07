import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AuthGuard, CurrentUser, OrgContextGuard, OrgRoleGuard, Supabase } from '@vibey/api-shared'
import { StripeApiService } from '../services/stripe-api.service'

@Controller('integrations/stripe')
export class StripeDataController {
  constructor(private readonly api: StripeApiService) {}

  @Get('charges')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listCharges(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.api.listCharges(supabase, user.id, {
      limit: query.limit ? Number(query.limit) : undefined,
      starting_after: query.starting_after,
      created_gte: query.created_gte ? Number(query.created_gte) : undefined,
      created_lte: query.created_lte ? Number(query.created_lte) : undefined,
      customer: query.customer,
    })
  }

  @Get('customers')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listCustomers(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.api.listCustomers(supabase, user.id, {
      limit: query.limit ? Number(query.limit) : undefined,
      starting_after: query.starting_after,
      email: query.email,
      created_gte: query.created_gte ? Number(query.created_gte) : undefined,
      created_lte: query.created_lte ? Number(query.created_lte) : undefined,
    })
  }

  @Get('subscriptions')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listSubscriptions(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.api.listSubscriptions(supabase, user.id, {
      limit: query.limit ? Number(query.limit) : undefined,
      starting_after: query.starting_after,
      status: query.status,
      customer: query.customer,
      created_gte: query.created_gte ? Number(query.created_gte) : undefined,
      created_lte: query.created_lte ? Number(query.created_lte) : undefined,
    })
  }

  @Get('invoices')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listInvoices(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.api.listInvoices(supabase, user.id, {
      limit: query.limit ? Number(query.limit) : undefined,
      starting_after: query.starting_after,
      status: query.status,
      customer: query.customer,
      subscription: query.subscription,
      created_gte: query.created_gte ? Number(query.created_gte) : undefined,
      created_lte: query.created_lte ? Number(query.created_lte) : undefined,
    })
  }
}
