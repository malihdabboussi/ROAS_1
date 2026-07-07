import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import type { Request } from 'express'
import { ZodValidationPipe } from '@vibey/api-shared'
import { PublicWebhookTokenParamSchema, type PublicWebhookTokenParam } from '../dto'
import { SpaceWebhooksService } from '../services/space-webhooks.service'

@Controller('flow-webhooks')
@UseGuards(ThrottlerGuard)
export class SpaceWebhookReceiverController {
  constructor(private readonly webhooksService: SpaceWebhooksService) {}

  @Post(':publicToken')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 120 } })
  async receiveWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Param(new ZodValidationPipe(PublicWebhookTokenParamSchema))
    params: PublicWebhookTokenParam,
    @Headers('x-vibey-signature') signature?: string,
    @Headers('x-vibey-event-id') vibeyEventId?: string,
    @Headers('x-webhook-id') webhookId?: string,
    @Query() query?: Record<string, unknown>,
  ) {
    return this.webhooksService.handleIncomingWebhook({
      publicToken: params.publicToken,
      rawBody: req.rawBody,
      signature,
      idempotencyKey: vibeyEventId ?? webhookId,
      query,
      headers: req.headers as Record<string, unknown>,
    })
  }
}
