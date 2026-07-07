import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common'
import { InternalAuthGuard } from '../../funnels/guards/internal-auth.guard'
import { CONTACT_CHANNELS, isContactChannel } from '../services/contact-identifier.service'
import { LeadsService } from '../services/leads.service'

/**
 * Service-to-service contact resolution (agent-api widget, future channels).
 * Auth: INTERNAL_API_TOKEN via InternalAuthGuard. Uses service-role Supabase client.
 */
@Controller('internal/contacts')
@UseGuards(InternalAuthGuard)
export class InternalContactsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post('resolve')
  @HttpCode(HttpStatus.OK)
  async resolveContact(
    @Body()
    body: {
      user_id?: string
      org_id?: string | null
      email?: string | null
      phone?: string | null
      first_name?: string | null
      last_name?: string | null
      channel?: string
      detail?: string | null
      campaign_id?: string | null
      agent_key?: string | null
    },
  ) {
    if (!body.user_id || typeof body.user_id !== 'string') {
      throw new BadRequestException('user_id is required')
    }
    if (!isContactChannel(body.channel)) {
      throw new BadRequestException(`channel must be one of: ${CONTACT_CHANNELS.join(', ')}`)
    }
    return this.leadsService.resolveContactForChannel({
      userId: body.user_id,
      orgId: body.org_id ?? null,
      email: typeof body.email === 'string' ? body.email : null,
      phone: typeof body.phone === 'string' ? body.phone : null,
      firstName: typeof body.first_name === 'string' ? body.first_name : null,
      lastName: typeof body.last_name === 'string' ? body.last_name : null,
      channel: body.channel,
      detail: typeof body.detail === 'string' ? body.detail : null,
      campaignId: typeof body.campaign_id === 'string' ? body.campaign_id : null,
      agentKey: typeof body.agent_key === 'string' ? body.agent_key : null,
    })
  }
}
