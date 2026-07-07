import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import { InternalAuthGuard } from '../guards/internal-auth.guard'
import { FunnelsService } from '../services/funnels.service'

/**
 * Internal Funnels Controller
 *
 * Service-to-service endpoints for the Vibey agent.
 * Auth: INTERNAL_API_TOKEN via InternalAuthGuard.
 * Uses service role Supabase client (no RLS).
 */
@Controller('internal/funnels')
@UseGuards(InternalAuthGuard)
export class InternalFunnelsController {
  constructor(private readonly funnelsService: FunnelsService) {}

  /**
   * POST /api/internal/funnels
   * Create a funnel on behalf of a user (agent call).
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createFunnel(
    @Body()
    body: {
      user_id: string
      name: string
      funnel_type: string
      campaign_id: string
    },
  ) {
    if (!body.user_id || !body.name || !body.funnel_type || !body.campaign_id) {
      throw new BadRequestException('user_id, name, funnel_type, and campaign_id are required')
    }
    return this.funnelsService.createFunnelInternal(body)
  }

  /**
   * POST /api/internal/funnels/:id/pages
   * Create a funnel page (agent call).
   */
  @Post(':id/pages')
  @HttpCode(HttpStatus.CREATED)
  async createPage(
    @Param('id') funnelId: string,
    @Body()
    body: {
      name: string
      page_type?: string
      generated_html: string
      generated_css: string
      slug?: string
      path?: string
      order_index: number
    },
  ) {
    if (
      !body.name ||
      body.generated_html === undefined ||
      body.generated_css === undefined ||
      body.order_index === undefined
    ) {
      throw new BadRequestException(
        'name, generated_html, generated_css, and order_index are required',
      )
    }
    return this.funnelsService.createPageInternal(funnelId, body)
  }
}
