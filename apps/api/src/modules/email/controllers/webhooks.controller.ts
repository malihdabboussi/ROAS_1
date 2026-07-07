import { Controller, HttpStatus, Logger, Post, RawBodyRequest, Req, Res } from '@nestjs/common'
import type { Request, Response } from 'express'
import { SendGridIntegration } from '../integrations/sendgrid.integration'
import { EmailWebhookEventsService } from '../services/email-webhook-events.service'

@Controller('email/webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name)

  constructor(
    private readonly sendgrid: SendGridIntegration,
    private readonly events: EmailWebhookEventsService,
  ) {}

  @Post('events')
  async handleEventWebhook(@Req() req: RawBodyRequest<Request>, @Res() res: Response) {
    const signature = req.headers[this.sendgrid.getSignatureHeaderName().toLowerCase()] as string
    const timestamp = req.headers[this.sendgrid.getTimestampHeaderName().toLowerCase()] as string

    if (!signature || !timestamp) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ error: 'Missing webhook signature headers' })
    }

    const rawBody = req.rawBody || req.body
    if (!rawBody) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing request body' })
    }

    const isValid = this.sendgrid.verifyWebhookSignature(rawBody, signature, timestamp)
    if (!isValid) {
      this.logger.warn('Invalid webhook signature')
      return res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Invalid webhook signature' })
    }

    try {
      const events = this.sendgrid.parseWebhookEvents(rawBody)
      this.logger.log(`Processing ${events.length} webhook events`)

      let processed = 0

      for (const event of events) {
        try {
          await this.events.processEvent(event)
          processed++
        } catch (err) {
          this.logger.warn(
            `Failed to process event ${event.sg_event_id}: ${err instanceof Error ? err.message : err}`,
          )
        }
      }

      return res.status(HttpStatus.OK).json({ received: events.length, processed })
    } catch (error) {
      this.logger.error(`Failed to process webhook events: ${error}`)
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ error: 'Failed to process events' })
    }
  }

  @Post('inbound')
  async handleInboundWebhook(@Req() req: Request, @Res() res: Response) {
    try {
      this.logger.log('Received inbound email webhook')
      return res.status(HttpStatus.OK).json({ received: true })
    } catch (error) {
      this.logger.error(`Failed to process inbound email: ${error}`)
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ error: 'Failed to process inbound email' })
    }
  }
}
