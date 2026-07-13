import type { SupabaseClient } from '@supabase/supabase-js'
import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common'
import { resolveFunnelsBaseDomain } from '../../../lib/platform-defaults'
import { VercelIntegration } from '../../domains/integrations/vercel.integration'
import { SpaceAutomationService } from '../../spaces/services/space-automation.service'
import { FunnelPagesRepository } from '../repositories/funnel-pages.repository'
import { FunnelRuntimeRepository } from '../repositories/funnel-runtime.repository'
import { FunnelsRepository } from '../repositories/funnels.repository'

@Injectable()
export class FunnelPublishService {
  private readonly logger = new Logger(FunnelPublishService.name)
  private static readonly PUBLISH_THEME_CSS_START = '/* vibey-theme-vars:start */'
  private static readonly PUBLISH_THEME_CSS_END = '/* vibey-theme-vars:end */'
  private readonly publishFallbackTsx = `export default function FunnelPage() {
  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: '24px', fontFamily: 'Inter, system-ui, sans-serif', background: '#0f1116', color: '#e5e7eb' }}>
      <section style={{ maxWidth: '720px', width: '100%', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '20px', background: 'rgba(255,255,255,0.04)' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 700 }}>This page is being repaired</h1>
        <p style={{ margin: 0, opacity: 0.86 }}>
          The published TSX failed validation and was auto-recovered with a safe fallback.
        </p>
      </section>
    </main>
  )
}`

  constructor(
    private readonly funnelsRepo: FunnelsRepository,
    private readonly pagesRepo: FunnelPagesRepository,
    private readonly vercelIntegration: VercelIntegration,
    @Optional()
    private readonly spaceAutomation?: SpaceAutomationService,
    private readonly funnelRuntime: FunnelRuntimeRepository = new FunnelRuntimeRepository(),
  ) {}

  async publishFunnel(supabase: SupabaseClient, id: string, orgId?: string | null) {
    const funnel = await this.funnelsRepo.findById(supabase, id)
    if (!funnel) throw new NotFoundException('Funnel not found')
    const pages = await this.pagesRepo.findByFunnelId(supabase, id)
    const themeCss = await this.resolvePublishThemeCss(funnel as Record<string, unknown>)
    const homePageId = (funnel as Record<string, unknown>).home_page_id as string | null
    for (const page of pages) {
      const raw = String((page as Record<string, unknown>).generated_html ?? '')
      const fixed = this.repairPublishTsx(raw)
      const rawCss = String((page as Record<string, unknown>).generated_css ?? '')
      const mergedCss = this.mergeThemeCssIntoPageCss(rawCss, themeCss)
      const pageId = String((page as Record<string, unknown>).id)
      const currentPath = (page as Record<string, unknown>).path as string | null
      const updates: Record<string, unknown> = {}
      if (fixed !== raw) updates.generated_html = fixed
      if (mergedCss !== rawCss) updates.generated_css = mergedCss
      if (!currentPath) {
        const isHome = homePageId
          ? pageId === homePageId
          : (page as Record<string, unknown>).order_index === 0
        if (isHome) {
          updates.path = '/'
        } else {
          const pageType = (page as Record<string, unknown>).page_type as string | null
          const pageSlug = (page as Record<string, unknown>).slug as string | null
          updates.path = `/${pageSlug || pageType || pageId}`
        }
      }
      if (Object.keys(updates).length > 0) {
        await this.pagesRepo.update(supabase, pageId, updates)
      }
    }

    const userId = (funnel as Record<string, unknown>).user_id as string
    const slug = await this.resolvePublishSlug(id, funnel as Record<string, unknown>)
    const domainId = (funnel as Record<string, unknown>).domain_id as string | null
    const liveUrl = domainId
      ? await this.resolveCustomDomainUrl(supabase, domainId, slug)
      : `https://${await this.ensureUserSubdomain(userId, orgId)}/${slug}`

    await this.funnelsRepo.update(supabase, id, {
      slug,
      status: 'published',
      published_url: liveUrl,
    })

    await this.spaceAutomation?.processArtifactLifecycleEvent(supabase, {
      artifact_kind:
        (funnel as Record<string, unknown>).funnel_type === 'website' ? 'website' : 'funnel',
      lifecycle_event: 'published',
      artifact_id: id,
      campaign_id: String((funnel as Record<string, unknown>).campaign_id),
      user_id: userId,
      org_id: ((funnel as Record<string, unknown>).org_id as string | null) ?? orgId ?? null,
      title: String((funnel as Record<string, unknown>).name ?? ''),
      status: 'published',
      url: liveUrl,
    })

    return {
      success: true,
      slug,
      url: liveUrl,
      status: 'published',
    }
  }

  async unpublishFunnel(supabase: SupabaseClient, id: string, orgId?: string | null) {
    const funnel = await this.funnelsRepo.findById(supabase, id, orgId)
    if (!funnel) throw new NotFoundException('Funnel not found')

    await this.funnelsRepo.update(supabase, id, {
      status: 'draft',
    })

    await this.spaceAutomation?.processArtifactLifecycleEvent(supabase, {
      artifact_kind:
        (funnel as Record<string, unknown>).funnel_type === 'website' ? 'website' : 'funnel',
      lifecycle_event: 'unpublished',
      artifact_id: id,
      campaign_id: String((funnel as Record<string, unknown>).campaign_id),
      user_id: String((funnel as Record<string, unknown>).user_id),
      org_id: ((funnel as Record<string, unknown>).org_id as string | null) ?? orgId ?? null,
      title: String((funnel as Record<string, unknown>).name ?? ''),
      status: 'draft',
    })

    return { success: true, status: 'draft' }
  }

  private async resolvePublishSlug(id: string, funnel: Record<string, unknown>): Promise<string> {
    let slug = funnel.slug as string | null
    if (slug) return slug

    const name = ((funnel as Record<string, unknown>).name as string) || 'funnel'
    slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60)

    const serviceClient = this.funnelRuntime.createServiceClient()
    const existing = await this.funnelRuntime.findFunnelSlugConflict(serviceClient, slug, id)

    if (existing) {
      const suffix = Math.random().toString(36).slice(2, 6)
      slug = `${slug}-${suffix}`
    }
    return slug
  }

  private async resolveCustomDomainUrl(
    supabase: SupabaseClient,
    domainId: string,
    slug: string,
  ): Promise<string> {
    const domainName = await this.funnelRuntime.findDomainName(supabase, domainId)
    if (!domainName) {
      throw new Error(`Domain not found for funnel: ${domainId}`)
    }
    return `https://${domainName}/${slug}`
  }

  private repairPublishTsx(source: string): string {
    let next = source.trim()
    for (let attempt = 0; attempt < 3; attempt++) {
      if (!this.isInvalidTsx(next)) return next
      next = this.applyLightRepair(next)
    }
    return this.publishFallbackTsx
  }

  private applyLightRepair(source: string): string {
    let next = source.trim()
    if (next.startsWith('```')) {
      next = next
        .replace(/^```[a-zA-Z0-9_-]*\n?/, '')
        .replace(/\n?```$/, '')
        .trim()
    }

    if (/^<[^>]+>[\s\S]*<\/[^>]+>$/.test(next) && !/export\s+default/.test(next)) {
      return `export default function FunnelPage() {\n  return (\n    ${next}\n  )\n}`
    }

    const fn = next.match(/function\s+([A-Z][A-Za-z0-9_]*)\s*\(/)
    if (fn && !/export\s+default/.test(next)) {
      return `${next}\n\nexport default ${fn[1]}`
    }

    const constMatch = next.match(/const\s+([A-Z][A-Za-z0-9_]*)\s*=/)
    if (constMatch && !/export\s+default/.test(next)) {
      return `${next}\n\nexport default ${constMatch[1]}`
    }

    return next
  }

  private isInvalidTsx(source: string): boolean {
    if (!source.trim()) return true
    if (/^@import\s+url\(/i.test(source)) return true
    if (/^(?::root|html|body|\.[\w-]+|#[\w-]+)\s*\{/.test(source)) return true
    if (/<style[\s>]/i.test(source)) return true
    if (/--[\w-]+\s*:\s*[^;]+;/.test(source) && !/export\s+default/.test(source)) return true
    const hasComponentSignature =
      /\bexport\s+default\b/.test(source) ||
      /\bfunction\s+[A-Z][A-Za-z0-9_]*\s*\(/.test(source) ||
      /\bconst\s+[A-Z][A-Za-z0-9_]*\s*=/.test(source)
    return !hasComponentSignature
  }

  private async ensureUserSubdomain(userId: string, orgId?: string | null): Promise<string> {
    const serviceClient = this.funnelRuntime.createServiceClient()

    const existing = await this.funnelRuntime.findGeneratedDomain(serviceClient, userId)

    if (existing) {
      return existing.domain_name as string
    }

    const baseDomain = resolveFunnelsBaseDomain()
    let subdomain = `user-${userId.slice(0, 8)}.${baseDomain}`

    const conflict = await this.funnelRuntime.findDomainConflict(serviceClient, subdomain)

    if (conflict) {
      const suffix = Math.random().toString(36).slice(2, 6)
      subdomain = `user-${userId.slice(0, 8)}-${suffix}.${baseDomain}`
    }

    await this.funnelRuntime.insertGeneratedDomain(serviceClient, {
      domain: subdomain,
      domain_name: subdomain,
      user_id: userId,
      domain_type: 'generated',
      status: 'verified',
      vercel_project_id: process.env.VERCEL_FUNNELS_PROJECT_ID || '',
      org_id: orgId ?? null,
    })

    const vercelResult = await this.vercelIntegration.addDomain(subdomain)
    if (!vercelResult.success) {
      this.logger.warn(`Vercel domain registration failed for ${subdomain}: ${vercelResult.error}`)
    }

    return subdomain
  }

  private mergeThemeCssIntoPageCss(pageCss: string, themeCss: string): string {
    const cleanedPageCss = this.stripPublishThemeCss(pageCss)
    if (!themeCss) return cleanedPageCss
    if (!cleanedPageCss) return themeCss
    return `${themeCss}\n\n${cleanedPageCss}`.trim()
  }

  private stripPublishThemeCss(css: string): string {
    if (!css.trim()) return ''
    const escapedStart = FunnelPublishService.PUBLISH_THEME_CSS_START.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&',
    )
    const escapedEnd = FunnelPublishService.PUBLISH_THEME_CSS_END.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&',
    )
    const re = new RegExp(`${escapedStart}[\\s\\S]*?${escapedEnd}`, 'g')
    return css.replace(re, '').trim()
  }

  private async resolvePublishThemeCss(funnel: Record<string, unknown>): Promise<string> {
    const themeId = this.asNonEmptyString(funnel.theme_id)
    if (!themeId) return ''

    const serviceClient = this.funnelRuntime.createServiceClient()
    const theme = await this.funnelRuntime.findPublishTheme(serviceClient, themeId)
    if (!theme) return ''
    return this.buildPublishThemeCss(theme as Record<string, unknown>)
  }

  private buildPublishThemeCss(theme: Record<string, unknown>): string {
    const colors = this.asRecord(theme.colors)
    if (!colors) return ''
    const vars: Array<[string, string | null]> = [
      ['--color-primary', this.asNonEmptyString(colors.primary)],
      ['--color-primary-foreground', this.asNonEmptyString(colors.primaryForeground)],
      ['--color-secondary', this.asNonEmptyString(colors.secondaryAccent1)],
      ['--color-secondary-accent-1', this.asNonEmptyString(colors.secondaryAccent1)],
      ['--color-secondary-accent-2', this.asNonEmptyString(colors.secondaryAccent2)],
      ['--color-accent', this.asNonEmptyString(colors.secondaryAccent2)],
      ['--color-foreground', this.asNonEmptyString(colors.heading)],
      ['--color-muted-foreground', this.asNonEmptyString(colors.body)],
      ['--color-background', this.asNonEmptyString(colors.pageBackground)],
      ['--color-page-background', this.asNonEmptyString(colors.pageBackground)],
      ['--color-card', this.asNonEmptyString(colors.cardBackground)],
      ['--color-border', this.asNonEmptyString(colors.border)],
      ['--color-input', this.asNonEmptyString(colors.input)],
      ['--color-success', this.asNonEmptyString(colors.success)],
      ['--color-warning', this.asNonEmptyString(colors.warning)],
      ['--color-danger', this.asNonEmptyString(colors.danger)],
      ['--font-heading', this.asNonEmptyString(theme.font_heading)],
      ['--font-body', this.asNonEmptyString(theme.font_body)],
    ]
    const body = vars
      .filter(([, value]) => typeof value === 'string' && value.length > 0)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join('\n')
    if (!body) return ''

    return [
      FunnelPublishService.PUBLISH_THEME_CSS_START,
      `:root {\n${body}\n}`,
      FunnelPublishService.PUBLISH_THEME_CSS_END,
    ].join('\n')
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    return value as Record<string, unknown>
  }

  private asNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }
}
