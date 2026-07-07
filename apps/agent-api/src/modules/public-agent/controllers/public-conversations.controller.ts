import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import type { Request } from 'express'
import { PublicAgentGuard } from '../guards/public-agent.guard'
import { PublicAgentService } from '../services/public-agent.service'

@Controller('public-conversations')
@UseGuards(PublicAgentGuard, ThrottlerGuard)
export class PublicConversationsController {
  constructor(private readonly publicAgentService: PublicAgentService) {}

  @Post()
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  async createConversation(
    @Body()
    body: {
      visitor_id: string
      agent_key?: string
      email?: string
      first_name?: string
      last_name?: string
      name?: string
    },
    @Req()
    req: Request & {
      publicAgent?: {
        userId: string | null
        orgId: string | null
        agentKey: string
        widgetCampaignId?: string | null
      }
    },
  ) {
    const { userId, orgId, agentKey, widgetCampaignId } = req.publicAgent!
    return this.publicAgentService.createPublicConversation(
      { userId, orgId, agentKey, widgetCampaignId },
      body,
    )
  }

  @Get()
  @Throttle({ default: { ttl: 60000, limit: 60 } })
  async listConversations(
    @Query('visitor_id') visitorId: string,
    @Query('email') emailQuery: string | undefined,
    @Req()
    req: Request & {
      publicAgent?: { userId: string | null; orgId: string | null; agentKey: string }
    },
  ) {
    const { userId, orgId, agentKey } = req.publicAgent!
    return this.publicAgentService.listPublicConversations(
      { userId, orgId, agentKey },
      visitorId,
      emailQuery,
    )
  }

  @Patch(':id')
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  async renameConversation(
    @Param('id') conversationId: string,
    @Body() body: { visitor_id: string; title: string },
    @Req()
    req: Request & {
      publicAgent?: { userId: string | null; orgId: string | null; agentKey: string }
    },
  ) {
    const { userId, orgId, agentKey } = req.publicAgent!
    return this.publicAgentService.renamePublicConversation(
      { userId, orgId, agentKey },
      conversationId,
      body,
    )
  }

  @Get(':id/messages')
  @Throttle({ default: { ttl: 60000, limit: 60 } })
  async getMessages(
    @Param('id') conversationId: string,
    @Req()
    req: Request & {
      publicAgent?: { userId: string | null; orgId: string | null; agentKey: string }
    },
  ) {
    const { userId, orgId } = req.publicAgent!
    return this.publicAgentService.listPublicConversationMessages({ userId, orgId }, conversationId)
  }
}
