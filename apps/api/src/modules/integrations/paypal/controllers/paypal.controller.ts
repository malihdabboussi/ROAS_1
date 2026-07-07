import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Response } from 'express'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
} from '@vibey/api-shared'
import type { RequestScope } from '@vibey/api-shared'
import {
  PayPalTransactionByIdQuerySchema,
  PayPalTransactionSearchQuerySchema,
  StartPayPalConnectSchema,
} from '../dto/paypal.dto'
import { PaypalApiService } from '../services/paypal-api.service'
import { PaypalOAuthService } from '../services/paypal-oauth.service'

@Controller('integrations/paypal')
export class PaypalController {
  constructor(
    private readonly oauth: PaypalOAuthService,
    private readonly api: PaypalApiService,
  ) {}

  @Get('status')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async status(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
  ) {
    const result = await this.oauth.getStatus(supabase, user.id, scope.orgId)
    return { success: true, ...result }
  }

  @Post('connect')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async connect(
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body() body: unknown,
  ) {
    const validation = StartPayPalConnectSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    const connectionScope = validation.data.connection_scope ?? 'personal'
    if (
      scope.orgId &&
      connectionScope === 'org_shared' &&
      scope.orgRole !== 'owner' &&
      scope.orgRole !== 'admin'
    ) {
      throw new HttpException(
        { success: false, error: 'Only org admin/owner can create All Org connections.' },
        HttpStatus.FORBIDDEN,
      )
    }
    const authorizeUrl = this.oauth.getAuthorizationUrl(
      user.id,
      validation.data.redirectTo,
      scope.orgId,
      connectionScope,
    )
    return { success: true, authorizeUrl }
  }

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') paypalError: string | undefined,
    @Query('error_description') paypalErrorDescription: string | undefined,
    @Res() res: Response,
  ) {
    // User denied consent or PayPal returned an error in the callback query.
    if (paypalError) {
      return res.redirect(
        this.oauth.buildCallbackErrorRedirect(state, paypalError || 'access_denied'),
      )
    }
    if (!code || !state) {
      return res.redirect(this.oauth.buildCallbackErrorRedirect(state, 'missing_code_or_state'))
    }
    try {
      const redirectTo = await this.oauth.handleCallback(code, state)
      return res.redirect(redirectTo)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'PayPal OAuth failed'
      const code = /userinfo/i.test(msg)
        ? 'userinfo_failed'
        : /token exchange/i.test(msg)
          ? 'token_exchange_failed'
          : /state/i.test(msg)
            ? 'invalid_state'
            : 'callback_failed'
      // `paypalErrorDescription` is captured for future telemetry / logging; no-op today.
      void paypalErrorDescription
      return res.redirect(this.oauth.buildCallbackErrorRedirect(state, code))
    }
  }

  @Post('disconnect')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async disconnect(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
  ) {
    await this.oauth.disconnect(supabase, user.id, scope.orgId)
    return { success: true }
  }

  @Get('transactions')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listTransactions(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Query() query: Record<string, string | undefined>,
  ) {
    const validation = PayPalTransactionSearchQuerySchema.safeParse(query)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    return this.api.searchTransactions(supabase, user.id, validation.data)
  }

  @Get('transactions/:transactionId')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getTransaction(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('transactionId') transactionId: string,
    @Query() query: Record<string, string | undefined>,
  ) {
    const validation = PayPalTransactionByIdQuerySchema.safeParse(query)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }
    return this.api.getTransactionById(
      supabase,
      user.id,
      transactionId,
      validation.data.start_date,
      validation.data.end_date,
    )
  }

  @Get('balance')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async balance(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Query('as_of_time') asOfTime?: string,
    @Query('currency_code') currencyCode?: string,
  ) {
    return this.api.getBalances(supabase, user.id, asOfTime, currencyCode)
  }
}
