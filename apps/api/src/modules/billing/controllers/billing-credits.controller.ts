import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import { AuthGuard, CurrentUser } from '@vibey/api-shared'
import type { PurchaseCreditsBody } from '../billing-http.types'
import { StripeService } from '../services/stripe.service'

@Controller('billing')
export class BillingCreditsController {
  private readonly logger = new Logger('BillingController')

  constructor(private readonly stripeService: StripeService) {}

  @Post('purchase-credits')
  @UseGuards(AuthGuard, ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  async purchaseCredits(
    @CurrentUser() user: { id: string; email: string },
    @Body() body: PurchaseCreditsBody,
  ): Promise<any> {
    try {
      if (!body.packId) {
        throw new BadRequestException('packId is required')
      }

      const quantity = Math.max(1, Math.min(20, Math.floor(body.quantity ?? 1)))

      this.logger.log(
        `[purchase-credits] User: ${user.id} (${user.email}), Pack: ${body.packId}, Qty: ${quantity}`,
      )

      try {
        const oneClickResult = await this.stripeService.purchaseCreditsOneClick(
          user.id,
          body.packId,
          quantity,
        )
        if (oneClickResult) {
          return oneClickResult
        }
        this.logger.log(`[purchase-credits] No saved payment method, falling back to checkout`)
      } catch (err) {
        this.logger.warn(
          `1-click purchase failed for user ${user.id}: ${err instanceof Error ? err.message : 'Unknown'}`,
        )
      }

      const appUrl = process.env.APP_URL
      if (!appUrl) throw new Error('APP_URL env var is required')
      const successUrl = body.successUrl ?? `${appUrl}/studio?credits=purchased`
      const cancelUrl = body.cancelUrl ?? `${appUrl}/studio?canceled=true`

      this.logger.log(`[purchase-credits] Creating checkout session, successUrl: ${successUrl}`)
      const result = await this.stripeService.createCreditPurchaseSession(
        user.id,
        user.email,
        body.packId,
        successUrl,
        cancelUrl,
        quantity,
      )
      this.logger.log(`[purchase-credits] Checkout session created: ${result.sessionId}`)
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const stack = err instanceof Error ? err.stack : ''
      this.logger.error(`[purchase-credits] FULL ERROR: ${msg}\n${stack}`)
      return { error: true, message: msg, stack: stack?.split('\n').slice(0, 5) }
    }
  }
}
