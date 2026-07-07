import { Controller, Get, Param, Query, UnauthorizedException } from '@nestjs/common'
import { FunnelsService } from '../services/funnels.service'

/**
 * Preview Controller
 *
 * Public endpoint (no auth guard) — uses HMAC-signed token for verification.
 * Returns page content for iframe rendering.
 */
@Controller('preview')
export class PreviewController {
  constructor(private readonly funnelsService: FunnelsService) {}

  /**
   * GET /api/preview/pages/:pageId?token=xxx
   * Public — validates HMAC token, returns page content as JSON.
   */
  @Get('pages/:pageId')
  async getPagePreview(@Param('pageId') pageId: string, @Query('token') token: string) {
    if (!token) {
      throw new UnauthorizedException('Preview token is required')
    }

    if (!this.funnelsService.verifyPreviewToken(pageId, token)) {
      throw new UnauthorizedException('Invalid or expired preview token')
    }

    return this.funnelsService.getPageForPreview(pageId)
  }
}
