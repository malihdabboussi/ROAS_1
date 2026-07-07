import {
  Controller,
  Get,
  Headers,
  HttpStatus,
  Post,
  Query,
  RawBodyRequest,
  Req,
  Res,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { IntegrationsComposioService } from '../services/integrations-composio.service'

@Controller('integrations')
export class IntegrationsComposioBridgeController {
  constructor(private readonly composioOps: IntegrationsComposioService) {}

  @Get('composio/callback')
  async composioCallbackBridge(
    @Res() res: Response,
    @Query('redirect_to') redirectToRaw?: string,
    @Query('integration_id') integrationIdRaw?: string,
    @Query('error') errorRaw?: string,
    @Query('message') messageRaw?: string,
  ) {
    const url = this.composioOps.buildComposioCallbackRedirectUrl(
      redirectToRaw,
      integrationIdRaw,
      errorRaw,
      messageRaw,
    )
    return res.redirect(url)
  }

  @Post('composio/webhook')
  async composioWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
    @Headers('webhook-id') webhookId?: string,
    @Headers('webhook-signature') webhookSignature?: string,
    @Headers('webhook-timestamp') webhookTimestamp?: string,
  ) {
    const result = await this.composioOps.handleComposioWebhook({
      rawBody: req.rawBody,
      webhookId,
      webhookSignature,
      webhookTimestamp,
    })
    if (result.success) return res.status(HttpStatus.OK).json(result)
    return res.status(Number(result.status ?? HttpStatus.BAD_REQUEST)).json(result)
  }
}
