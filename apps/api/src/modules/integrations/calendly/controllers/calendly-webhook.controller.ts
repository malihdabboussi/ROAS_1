import { Body, Controller, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common'
import type { CalendlyWebhookPayload } from '../types/calendly.types'

@Controller('integrations/calendly')
export class CalendlyWebhookController {
  private readonly logger = new Logger(CalendlyWebhookController.name)

  @Post('webhooks')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() payload: CalendlyWebhookPayload) {
    const event = payload.event
    const inviteeEmail = payload.payload?.email
    const scheduledEventUri = payload.payload?.scheduled_event?.uri

    this.logger.log(
      `Calendly webhook received: ${event} | invitee=${inviteeEmail} | event=${scheduledEventUri}`,
    )

    switch (event) {
      case 'invitee.created':
        await this.handleInviteeCreated(payload)
        break
      case 'invitee.canceled':
        await this.handleInviteeCanceled(payload)
        break
      default:
        this.logger.warn(`Unhandled Calendly webhook event: ${event}`)
    }

    return { received: true }
  }

  private async handleInviteeCreated(payload: CalendlyWebhookPayload): Promise<void> {
    this.logger.log(
      `New booking: ${payload.payload.name} (${payload.payload.email}) for ${payload.payload.scheduled_event?.name}`,
    )
    // Future: store in calendly_bookings table, link to funnel_id via UTM tracking
  }

  private async handleInviteeCanceled(payload: CalendlyWebhookPayload): Promise<void> {
    const reason = payload.payload.cancellation?.reason ?? 'No reason provided'
    this.logger.log(
      `Booking canceled: ${payload.payload.name} (${payload.payload.email}) | reason: ${reason}`,
    )
    // Future: update calendly_bookings status
  }
}
