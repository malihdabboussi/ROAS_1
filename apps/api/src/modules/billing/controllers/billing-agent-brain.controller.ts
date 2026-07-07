import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AuthGuard, CurrentUser, Supabase } from '@vibey/api-shared'
import type { AgentBrainCheckoutBody } from '../billing-http.types'
import { BillingUserActionsService } from '../services/billing-user-actions.service'
import { StripeService } from '../services/stripe.service'

@Controller('billing')
export class BillingAgentBrainController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly billingUserActionsService: BillingUserActionsService,
  ) {}

  @Get('agent-brains/batch')
  @UseGuards(AuthGuard, ThrottlerGuard)
  getAgentBrainStatusBatch(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @Query('agentIds') agentIdsRaw?: string,
    @Query('orgId') orgId?: string,
  ) {
    return this.billingUserActionsService.getAgentBrainStatusBatch(
      user.id,
      supabase,
      agentIdsRaw,
      orgId,
    )
  }

  @Get('agent-brain/status')
  @UseGuards(AuthGuard, ThrottlerGuard)
  getAgentBrainStatus(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @Query('agentId') agentId?: string,
    @Query('orgId') orgId?: string,
  ) {
    return this.billingUserActionsService.getAgentBrainStatus(user.id, supabase, agentId, orgId)
  }

  @Post('agent-brain/checkout')
  @UseGuards(AuthGuard, ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  async createAgentBrainCheckout(
    @CurrentUser() user: { id: string; email: string },
    @Body() body: AgentBrainCheckoutBody,
  ): Promise<{
    charged: boolean
    brainId: string
    subscriptionItemId: string
    url?: string
    sessionId?: string
  }> {
    if (!body.agentId?.trim()) {
      throw new BadRequestException('agentId is required')
    }

    const trimmedOrgId = body.orgId?.trim() || null
    if (trimmedOrgId) {
      return this.stripeService.addOrgAgentBrainAddon(
        trimmedOrgId,
        user.id,
        user.email,
        body.agentId.trim(),
      )
    }

    return this.stripeService.addAgentBrainAddon(user.id, user.email, body.agentId.trim())
  }

  @Delete('agent-brain/:agentId')
  @UseGuards(AuthGuard, ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  async cancelAgentBrain(
    @CurrentUser() user: { id: string; email: string },
    @Param('agentId') agentId: string,
  ): Promise<{ canceled: boolean; deletionAt: string | null }> {
    if (!agentId?.trim()) throw new BadRequestException('agentId is required')
    const result = await this.stripeService.cancelAgentBrainAddon(user.id, agentId.trim())
    return { canceled: true, deletionAt: result.deletionAt }
  }
}
