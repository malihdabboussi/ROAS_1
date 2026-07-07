import {
  Body,
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
import { MetaIntegration } from '../integrations/meta.integration'
import { MetaApiService } from '../services/meta-api.service'
import { MetaOAuthService } from '../services/meta-oauth.service'

@Controller('integrations/meta')
export class MetaWebhooksController {
  constructor(
    private readonly oauth: MetaOAuthService,
    private readonly api: MetaApiService,
    private readonly metaIntegration: MetaIntegration,
  ) {}

  @Get('webhook')
  async verifyWebhook(@Query() query: Record<string, string>, @Res() res: Response) {
    const mode = query['hub.mode']
    const token = query['hub.verify_token']
    const challenge = query['hub.challenge']
    const verifyToken = this.metaIntegration.getWebhookVerifyToken()

    if (mode === 'subscribe' && token && challenge && verifyToken && token === verifyToken) {
      return res.status(HttpStatus.OK).send(challenge)
    }

    return res.status(HttpStatus.FORBIDDEN).send('Webhook verification failed')
  }

  @Post('webhook')
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: string,
    @Res() res: Response,
  ) {
    if (!signature) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Missing signature header' })
    }

    const rawBody = req.rawBody
    if (!rawBody) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing raw body' })
    }

    const valid = this.metaIntegration.verifyWebhookSignature(rawBody, signature)
    if (!valid) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Invalid webhook signature' })
    }

    const payload = req.body as Record<string, unknown>
    const result = await this.api.handleAdRuleWebhook(payload)
    return res.status(HttpStatus.OK).json({ success: true, ...result })
  }

  @Post('data-deletion')
  async dataDeletion(@Body() body: { signed_request?: string }) {
    if (!body.signed_request) {
      return { url: '', confirmation_code: '' }
    }

    const result = await this.oauth.handleDataDeletion(body.signed_request)
    if (!result) {
      return { url: '', confirmation_code: '' }
    }

    return result
  }
}
