import { Controller, Get, Header, Logger, Req, UseGuards } from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import type { Request } from 'express'
import { PublicAgentGuard } from '../guards/public-agent.guard'
import { PublicAgentService } from '../services/public-agent.service'

@Controller('public-widget')
export class PublicWidgetController {
  private readonly logger = new Logger(PublicWidgetController.name)

  constructor(private readonly publicAgentService: PublicAgentService) {}

  @Get('config')
  @UseGuards(PublicAgentGuard, ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 60 } })
  @Header('Cache-Control', 'no-store')
  async getConfig(
    @Req()
    req: Request & {
      publicAgent?: {
        userId: string | null
        orgId: string | null
        agentKey: string
        widgetEnabled: boolean
        widgetAllowedOrigins: string[]
      }
    },
  ) {
    const { userId, orgId, agentKey, widgetEnabled } = req.publicAgent!

    if (!widgetEnabled) {
      return { ok: false, error: 'widget_disabled' }
    }

    const cfg = await this.publicAgentService.resolveWidgetConfig({ userId, orgId }, agentKey)
    if (!cfg) {
      return { ok: false, error: 'not_found' }
    }

    /** Acting user (org owner for org-scoped agents) — needed by the iframe page handler. */
    const actingUserId = await this.publicAgentService.resolveActingUserId({ userId, orgId })

    return {
      ok: true,
      config: {
        name: cfg.name,
        role: cfg.role,
        imageUrl: cfg.imageUrl,
        title: cfg.widgetTitle ?? cfg.name,
        subtitle: cfg.widgetShowSubtitle ? (cfg.widgetSubtitle ?? cfg.role) : null,
        showSubtitle: cfg.widgetShowSubtitle,
        greeting: cfg.widgetGreeting,
        accentColor: cfg.widgetAccentColor ?? '#7C3AED',
        launcherIconUrl: cfg.widgetLauncherIconUrl,
        position: cfg.widgetPosition,
        allowedOrigins: cfg.widgetAllowedOrigins,
        userSlug: cfg.userSlug,
        userId: actingUserId,
        agentKey,
        homeConfig: cfg.widgetHomeConfig,
        helpArticles: cfg.widgetHelpArticles,
        helpCollections: cfg.widgetHelpCollections,
        newsItems: cfg.widgetNewsItems,
      },
    }
  }
}
