import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ArtifactsPresentationFilesBase } from './artifacts-presentation-files.base'
import type { PresentationCommentRow } from './artifacts.types'

export class ArtifactsPresentationPublishBase extends ArtifactsPresentationFilesBase {
  protected async loadPresentationCommentAuthorNames(
    supabase: SupabaseClient,
    rows: PresentationCommentRow[],
    currentUserId: string,
  ): Promise<Map<string, string>> {
    const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))]
    const names = new Map<string, string>()
    if (userIds.length === 0) return names

    const profiles = await this.artifactPresentationsRepo.listProfilesByIds(supabase, userIds)
    for (const profile of profiles) {
      const id = typeof profile.id === 'string' ? profile.id : null
      const fullName = typeof profile.full_name === 'string' ? profile.full_name.trim() : ''
      if (id && fullName) names.set(id, fullName)
    }
    if (!names.has(currentUserId)) names.set(currentUserId, 'Sefy')
    return names
  }

  protected mapPresentationComment(
    row: PresentationCommentRow,
    authorNames: Map<string, string>,
  ): Record<string, unknown> {
    return {
      id: row.id,
      presentation_id: row.presentation_id,
      user_id: row.user_id,
      org_id: row.org_id,
      space_id: row.space_id,
      slide_index: row.slide_index,
      body: row.body,
      author_name: authorNames.get(row.user_id) ?? 'Teammate',
      created_at: row.created_at,
      updated_at: row.updated_at,
      resolved: row.resolved,
      resolved_at: row.resolved_at,
      resolved_by: row.resolved_by,
      element_trace: row.element_trace,
      replies: [],
    }
  }

  async listPresentationComments(
    supabase: SupabaseClient,
    userId: string,
    presentationId: string,
  ): Promise<Record<string, unknown>[]> {
    await this.getPresentation(supabase, presentationId)
    const rows = await this.artifactPresentationsRepo.listPresentationComments(
      supabase,
      presentationId,
    )
    const authorNames = await this.loadPresentationCommentAuthorNames(supabase, rows, userId)
    return rows.map((row) => this.mapPresentationComment(row, authorNames))
  }

  async upsertPresentationComment(
    supabase: SupabaseClient,
    userId: string,
    presentationId: string,
    commentId: string,
    input: {
      body: string
      slide_index?: number | null
      element_trace?: Record<string, unknown> | null
    },
  ): Promise<Record<string, unknown>> {
    const presentation = await this.getPresentation(supabase, presentationId)
    const value = String(input.body ?? '').trim()
    if (!value) throw new BadRequestException('body is required')

    const now = new Date().toISOString()
    const row = await this.artifactPresentationsRepo.upsertPresentationComment(supabase, {
      id: commentId,
      presentation_id: presentationId,
      user_id: userId,
      org_id: ((presentation as Record<string, unknown>).org_id as string | null) ?? null,
      space_id: ((presentation as Record<string, unknown>).space_id as string | null) ?? null,
      slide_index: input.slide_index ?? null,
      body: value,
      element_trace: input.element_trace ?? null,
      updated_at: now,
    })
    const authorNames = await this.loadPresentationCommentAuthorNames(supabase, [row], userId)
    return this.mapPresentationComment(row, authorNames)
  }

  async updatePresentationComment(
    supabase: SupabaseClient,
    userId: string,
    presentationId: string,
    commentId: string,
    patch: { body?: string; resolved?: boolean },
  ): Promise<Record<string, unknown>> {
    await this.getPresentation(supabase, presentationId)
    const existing = await this.artifactPresentationsRepo.findPresentationComment(
      supabase,
      presentationId,
      commentId,
    )
    if (!existing) throw new NotFoundException('Presentation comment not found')
    if ((existing as PresentationCommentRow).user_id !== userId) {
      throw new ForbiddenException('You can only update your own comments.')
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (patch.body !== undefined) {
      update.body = patch.body.trim()
    }
    if (patch.resolved !== undefined) {
      update.resolved = patch.resolved
      update.resolved_at = patch.resolved ? new Date().toISOString() : null
      update.resolved_by = patch.resolved ? userId : null
    }
    if (Object.keys(update).length === 1) {
      throw new BadRequestException('At least one field is required')
    }

    const row = await this.artifactPresentationsRepo.updatePresentationComment(
      supabase,
      presentationId,
      commentId,
      update,
    )
    const authorNames = await this.loadPresentationCommentAuthorNames(supabase, [row], userId)
    return this.mapPresentationComment(row, authorNames)
  }

  async deletePresentationComment(
    supabase: SupabaseClient,
    userId: string,
    presentationId: string,
    commentId: string,
  ): Promise<void> {
    await this.getPresentation(supabase, presentationId)
    const existing = await this.artifactPresentationsRepo.findPresentationComment(
      supabase,
      presentationId,
      commentId,
    )
    if (!existing) throw new NotFoundException('Presentation comment not found')
    if ((existing as { user_id?: string }).user_id !== userId) {
      throw new ForbiddenException('You can only delete your own comments.')
    }

    await this.artifactPresentationsRepo.deletePresentationComment(
      supabase,
      presentationId,
      commentId,
    )
  }

  async updatePresentation(
    supabase: SupabaseClient,
    id: string,
    updates: { name?: string; hide_branding?: boolean; metadata?: Record<string, unknown> },
  ) {
    const lm = await this.getPresentation(supabase, id)
    const update: Record<string, unknown> = {
      name: updates.name ?? lm.name,
      updated_at: new Date().toISOString(),
    }
    if (typeof updates.hide_branding === 'boolean') {
      update.hide_branding = updates.hide_branding
    }
    if (updates.metadata) {
      const currentMetadata =
        lm.metadata && typeof lm.metadata === 'object' && !Array.isArray(lm.metadata)
          ? (lm.metadata as Record<string, unknown>)
          : {}
      update.metadata = {
        ...currentMetadata,
        ...updates.metadata,
      }
    }
    return this.artifactPresentationsRepo.updatePresentation(supabase, id, update)
  }

  async deletePresentation(supabase: SupabaseClient, id: string) {
    await this.getPresentation(supabase, id)
    await this.artifactPresentationsRepo.deletePresentation(supabase, id)
  }

  async publishPresentation(supabase: SupabaseClient, id: string) {
    const lm = await this.getPresentation(supabase, id)
    const metadata = this.getPresentationMetadata(lm as Record<string, unknown>)
    const isHtmlBundle = metadata.source_mode === 'html_bundle'
    if (isHtmlBundle) {
      const bundle = await this.getPresentationBundle(supabase, id)
      if (!bundle.has_entry) {
        throw new BadRequestException('HTML presentation must include an entry file before publish')
      }
    }
    const rawGeneratedHtml =
      !isHtmlBundle && typeof lm.generated_html === 'string' ? lm.generated_html : null
    if (!isHtmlBundle && rawGeneratedHtml) {
      const repaired = this.repairPublishTsx(rawGeneratedHtml)
      if (repaired !== rawGeneratedHtml) {
        await this.artifactPresentationsRepo.updatePresentation(supabase, id, {
          generated_html: repaired,
          updated_at: new Date().toISOString(),
        })
      }
    }

    const userId = (lm as Record<string, unknown>).user_id as string

    // Re-use existing slug if already published
    let slug = (lm as Record<string, unknown>).slug as string | null

    if (!slug) {
      const name = ((lm as Record<string, unknown>).name as string) || 'presentation'
      slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60)

      // Check uniqueness via service role (bypasses RLS)
      const existing = await this.artifactPresentationsRepo.findSlugConflict(id, slug)

      if (existing) {
        const suffix = Math.random().toString(36).slice(2, 6)
        slug = `${slug}-${suffix}`
      }
    }

    const domainId = (lm as Record<string, unknown>).domain_id as string | null

    const publishedUrl = await (async () => {
      if (domainId) {
        const domainName = await this.artifactPresentationsRepo.findDomainName(supabase, domainId)
        if (!domainName) {
          throw new Error(`Domain not found for presentation: ${domainId}`)
        }
        return `https://${domainName}/p/${slug}`
      }

      // Match funnels publish behavior: publish to the user's generated subdomain.
      // Example: https://user-1234abcd.vibeyfunnels.com/p/my-presentation
      const subdomain = await this.ensureUserSubdomain(userId)
      return `https://${subdomain}/p/${slug}`
    })()

    const data = await this.artifactPresentationsRepo.updatePresentation(supabase, id, {
      slug,
      published_url: publishedUrl,
      status: 'published',
      updated_at: new Date().toISOString(),
    })

    await this.spaceAutomation?.processArtifactLifecycleEvent(supabase, {
      artifact_kind: 'presentation',
      lifecycle_event: 'published',
      artifact_id: id,
      campaign_id: String((lm as Record<string, unknown>).campaign_id),
      user_id: userId,
      org_id: ((lm as Record<string, unknown>).org_id as string | null) ?? null,
      title: String((lm as Record<string, unknown>).name ?? ''),
      status: 'published',
      url: publishedUrl,
    })

    return { success: true, slug, published_url: publishedUrl, status: 'published', data }
  }

  async unpublishPresentation(supabase: SupabaseClient, id: string) {
    await this.getPresentation(supabase, id)

    const data = await this.artifactPresentationsRepo.updatePresentation(supabase, id, {
      status: 'draft',
      updated_at: new Date().toISOString(),
    })

    await this.spaceAutomation?.processArtifactLifecycleEvent(supabase, {
      artifact_kind: 'presentation',
      lifecycle_event: 'unpublished',
      artifact_id: id,
      campaign_id: String((data as Record<string, unknown>).campaign_id),
      user_id: String((data as Record<string, unknown>).user_id),
      org_id: ((data as Record<string, unknown>).org_id as string | null) ?? null,
      title: String((data as Record<string, unknown>).name ?? ''),
      status: 'draft',
    })

    return { success: true, status: 'draft', data }
  }

  protected async ensureUserSubdomain(userId: string): Promise<string> {
    const existing = await this.artifactPresentationsRepo.findGeneratedDomain(userId)
    if (existing) return existing

    const baseDomain = process.env.CLOUDFLARE_BASE_DOMAIN || 'vibeyfunnels.com'
    let subdomain = `user-${userId.slice(0, 8)}.${baseDomain}`

    const conflict = await this.artifactPresentationsRepo.findDomainConflict(subdomain)

    if (conflict) {
      const suffix = Math.random().toString(36).slice(2, 6)
      subdomain = `user-${userId.slice(0, 8)}-${suffix}.${baseDomain}`
    }

    await this.artifactPresentationsRepo.insertGeneratedDomain({
      domain: subdomain,
      domain_name: subdomain,
      user_id: userId,
      domain_type: 'generated',
      status: 'verified',
      vercel_project_id: process.env.VERCEL_FUNNELS_PROJECT_ID || '',
    })

    const vercelResult = await this.vercelIntegration.addDomain(subdomain)
    if (!vercelResult.success) {
      this.logger.warn(`Vercel domain registration failed for ${subdomain}: ${vercelResult.error}`)
    }

    return subdomain
  }

  protected repairPublishTsx(source: string): string {
    let next = source.trim()
    for (let attempt = 0; attempt < 3; attempt++) {
      if (!this.isInvalidTsx(next)) return next
      next = this.applyLightRepair(next)
    }
    return this.publishFallbackPresentationTsx
  }

  protected applyLightRepair(source: string): string {
    let next = source.trim()
    if (next.startsWith('```')) {
      next = next
        .replace(/^```[a-zA-Z0-9_-]*\n?/, '')
        .replace(/\n?```$/, '')
        .trim()
    }

    if (/^<[^>]+>[\s\S]*<\/[^>]+>$/.test(next) && !/export\s+default/.test(next)) {
      next = `export default function PresentationPage() {\n  return (\n    ${next}\n  )\n}`
      return next
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

  protected isInvalidTsx(source: string): boolean {
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
}
