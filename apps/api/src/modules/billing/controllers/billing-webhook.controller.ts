import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common'
import type { Request } from 'express'
import { StripeService } from '../services/stripe.service'

@Controller('billing')
export class BillingWebhookController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean; type: string }> {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header')
    }

    const rawBody = req.rawBody
    if (!rawBody) {
      throw new BadRequestException('Missing raw body — ensure raw body parsing is enabled')
    }

    return this.stripeService.handleWebhookEvent(rawBody, signature)
  }
}
