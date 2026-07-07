import { Injectable } from '@nestjs/common'
import { ArtifactBrainNarrativeRepository } from '../repositories/artifact-brain-narrative.repository'
import { ArtifactBrainScholarRepository } from '../repositories/artifact-brain-scholar.repository'
import {
  buildBrainReadCursorScope,
  buildBrainReadPage,
  resolveBrainReadPageRequest,
} from './artifact-brain-read-pagination'

type NarrativeBrainResolver = (
  target: Record<string, any>,
  input: Record<string, unknown>,
  userId: string,
  sessionKey?: string,
  requiredAccess?: 'view' | 'query' | 'train',
) => Promise<{ brainId: string } | { error: string }>

type NarrativeWriterGuard = (
  target: Record<string, any>,
  sessionKey?: string,
) => { success: false; error: string } | null

@Injectable()
export class ArtifactBrainNarrativeActionsService {
  constructor(
    private readonly brainNarrativeRepository: ArtifactBrainNarrativeRepository = new ArtifactBrainNarrativeRepository(),
    private readonly brainScholarRepository: ArtifactBrainScholarRepository = new ArtifactBrainScholarRepository(),
  ) {}

  async getNarrativePages(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    resolveNarrativeBrainId: NarrativeBrainResolver,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const resolved = await resolveNarrativeBrainId(target, input, userId, sessionKey, 'query')
    if ('error' in resolved) return { success: false, error: resolved.error }
    const brainId = resolved.brainId

    const slug = typeof input.slug === 'string' ? input.slug.trim() : null
    const includeContent = slug ? true : input.include_content === true
    let pageType: string | null = null
    let status = 'active'
    if (slug) {
      status = 'active'
    } else {
      pageType = typeof input.page_type === 'string' ? input.page_type.trim() : null
      status = typeof input.status === 'string' ? input.status.trim() : 'active'
    }
    const pageRequest = resolveBrainReadPageRequest(input, {
      cursorScope: buildBrainReadCursorScope('get_brain_pages', {
        brainId,
        slug,
        pageType,
        status,
        includeContent,
      }),
    })
    if ('error' in pageRequest) return { success: false, error: pageRequest.error }

    const { data, error } = await this.brainNarrativeRepository.listNarrativePages(
      target.serviceClient,
      {
        brainId,
        slug,
        pageType,
        status,
        limit: pageRequest.fetchLimit,
        offset: pageRequest.offset,
        includeContent,
      },
    )
    if (error) return { success: false, error: `Failed to read narrative pages: ${error.message}` }
    const { items: pages, pagination } = buildBrainReadPage(pageRequest, data ?? [])
    return {
      success: true,
      count: pages.length,
      pagination,
      result_policy: includeContent
        ? {
            mode: 'detail',
            continuation_hint: 'Use pagination.next_cursor to read the next content batch.',
          }
        : {
            mode: 'summary',
            omitted_fields: ['content_md'],
            detail_hint: 'Pass slug or include_content=true for selected records.',
            continuation_hint: 'Use pagination.next_cursor to read the next summary batch.',
          },
      pages,
    }
  }

  async createNarrativePage(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    ensureAtlasNarrativeWriter: NarrativeWriterGuard,
    resolveNarrativeBrainId: NarrativeBrainResolver,
  ) {
    const writerCheck = ensureAtlasNarrativeWriter(target, sessionKey)
    if (writerCheck) return writerCheck
    const userId = target.resolveUserId(sessionKey)
    const resolved = await resolveNarrativeBrainId(target, input, userId, sessionKey, 'train')
    if ('error' in resolved) return { success: false, error: resolved.error }
    const brainId = resolved.brainId

    const slug = typeof input.slug === 'string' ? input.slug.trim() : ''
    const title = typeof input.title === 'string' ? input.title.trim() : ''
    const contentMd = typeof input.content_md === 'string' ? input.content_md : ''
    if (!slug) return { success: false, error: 'slug is required' }
    if (!title) return { success: false, error: 'title is required' }
    if (!contentMd) return { success: false, error: 'content_md is required' }

    const pageType = typeof input.page_type === 'string' ? input.page_type.trim() : 'topic'
    const summary = typeof input.summary === 'string' ? input.summary.trim() : null
    const tags = Array.isArray(input.tags)
      ? input.tags.filter((t): t is string => typeof t === 'string')
      : []
    const sourceRefs = Array.isArray(input.source_refs) ? input.source_refs : []

    let embedding: string | null = null
    if (target.embeddingService) {
      const orgId = target.resolveOrgId?.(sessionKey) ?? null
      const vec = await target.embeddingService.getEmbedding(contentMd.slice(0, 4000), {
        billing: { userId, orgId },
      })
      if (vec) embedding = `[${vec.join(',')}]`
    }

    const { data, error } = await this.brainNarrativeRepository.createPage(target.serviceClient, {
      brain_id: brainId,
      slug,
      title,
      page_type: pageType,
      content_md: contentMd,
      summary,
      source_refs: sourceRefs,
      tags,
      embedding,
      last_synthesis_at: new Date().toISOString(),
      status: 'active',
    })

    if (error) return { success: false, error: `Failed to create page: ${error.message}` }
    const dirSuffix = await this.resolveBrainDirSuffix(target, brainId)
    this.writePageToDisk(target, slug, contentMd, dirSuffix)
    return { success: true, page: data }
  }

  async patchNarrativePage(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    ensureAtlasNarrativeWriter: NarrativeWriterGuard,
    resolveNarrativeBrainId: NarrativeBrainResolver,
  ) {
    const writerCheck = ensureAtlasNarrativeWriter(target, sessionKey)
    if (writerCheck) return writerCheck
    const pageId = typeof input.id === 'string' ? input.id.trim() : ''
    if (!pageId) return { success: false, error: 'id is required' }

    const operation = typeof input.operation === 'string' ? input.operation.trim() : ''
    if (!operation) {
      return {
        success: false,
        error: 'operation is required (append_to_section, replace_section, add_section)',
      }
    }

    const content = typeof input.content === 'string' ? input.content : ''
    if (!content) return { success: false, error: 'content is required' }

    const { data: page, error: readErr } = await this.brainNarrativeRepository.findPage(
      target.serviceClient,
      { pageId, columns: 'id, slug, brain_id, content_md, source_refs, version' },
    )
    if (readErr || !page)
      return { success: false, error: `Page not found: ${readErr?.message ?? pageId}` }
    const patchTarget = await resolveNarrativeBrainId(
      target,
      input,
      target.resolveUserId(sessionKey),
      sessionKey,
      'train',
    )
    if ('error' in patchTarget) return { success: false, error: patchTarget.error }
    if (page.brain_id !== patchTarget.brainId) {
      return { success: false, error: 'Page does not belong to the requested brain target' }
    }

    let updatedMd: string
    const currentMd = page.content_md ?? ''

    if (operation === 'append_to_section') {
      const section = typeof input.section === 'string' ? input.section.trim() : ''
      if (!section) return { success: false, error: 'section is required for append_to_section' }
      updatedMd = this.appendToSection(currentMd, section, content)
      if (updatedMd === currentMd) {
        const sections = this.listSections(currentMd)
        return {
          success: false,
          error: `Section "${section}" not found. Available: ${sections.join(', ')}`,
        }
      }
    } else if (operation === 'replace_section') {
      const section = typeof input.section === 'string' ? input.section.trim() : ''
      if (!section) return { success: false, error: 'section is required for replace_section' }
      updatedMd = this.replaceSection(currentMd, section, content)
      if (updatedMd === currentMd) {
        const sections = this.listSections(currentMd)
        return {
          success: false,
          error: `Section "${section}" not found. Available: ${sections.join(', ')}`,
        }
      }
    } else if (operation === 'add_section') {
      const heading = typeof input.heading === 'string' ? input.heading.trim() : ''
      if (!heading) return { success: false, error: 'heading is required for add_section' }
      const after = typeof input.after === 'string' ? input.after.trim() : null
      updatedMd = this.addSection(currentMd, heading, content, after)
    } else {
      return { success: false, error: `Unknown operation: ${operation}` }
    }

    const newSourceRefs = Array.isArray(input.source_refs) ? input.source_refs : []
    const mergedRefs = [...(page.source_refs ?? []), ...newSourceRefs]
    const newSummary = typeof input.summary === 'string' ? input.summary.trim() : undefined

    const patchUserId = target.resolveUserId(sessionKey)
    const patchOrgId = target.resolveOrgId?.(sessionKey) ?? null
    let embedding: string | null = null
    if (target.embeddingService) {
      const vec = await target.embeddingService.getEmbedding(updatedMd.slice(0, 4000), {
        billing: { userId: patchUserId, orgId: patchOrgId },
      })
      if (vec) embedding = `[${vec.join(',')}]`
    }

    const updatePayload: Record<string, unknown> = {
      content_md: updatedMd,
      source_refs: mergedRefs,
      version: (page.version ?? 1) + 1,
      last_synthesis_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    if (embedding) updatePayload.embedding = embedding
    if (newSummary) updatePayload.summary = newSummary

    const { data: updated, error: writeErr } = await this.brainNarrativeRepository.updatePage(
      target.serviceClient,
      { pageId, payload: updatePayload, select: true },
    )

    if (writeErr) return { success: false, error: `Failed to patch page: ${writeErr.message}` }
    const dirSuffix = await this.resolveBrainDirSuffix(target, page.brain_id)
    this.writePageToDisk(target, page.slug, updatedMd, dirSuffix)
    return { success: true, page: updated }
  }

  async updateNarrativePage(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    ensureAtlasNarrativeWriter: NarrativeWriterGuard,
    resolveNarrativeBrainId: NarrativeBrainResolver,
  ) {
    const writerCheck = ensureAtlasNarrativeWriter(target, sessionKey)
    if (writerCheck) return writerCheck
    const pageId = typeof input.id === 'string' ? input.id.trim() : ''
    if (!pageId) return { success: false, error: 'id is required' }

    const { data: existing, error: readErr } = await this.brainNarrativeRepository.findPage(
      target.serviceClient,
      { pageId, columns: 'id, slug, brain_id, source_refs, version' },
    )
    if (readErr || !existing)
      return { success: false, error: `Page not found: ${readErr?.message ?? pageId}` }
    const updateTarget = await resolveNarrativeBrainId(
      target,
      input,
      target.resolveUserId(sessionKey),
      sessionKey,
      'train',
    )
    if ('error' in updateTarget) return { success: false, error: updateTarget.error }
    if (existing.brain_id !== updateTarget.brainId) {
      return { success: false, error: 'Page does not belong to the requested brain target' }
    }

    const updatePayload: Record<string, unknown> = {
      version: (existing.version ?? 1) + 1,
      last_synthesis_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const contentMd = typeof input.content_md === 'string' ? input.content_md : null
    if (contentMd !== null) {
      updatePayload.content_md = contentMd
      if (target.embeddingService) {
        const narrativeUserId = target.resolveUserId(sessionKey)
        const narrativeOrgId = target.resolveOrgId?.(sessionKey) ?? null
        const vec = await target.embeddingService.getEmbedding(contentMd.slice(0, 4000), {
          billing: { userId: narrativeUserId, orgId: narrativeOrgId },
        })
        if (vec) updatePayload.embedding = `[${vec.join(',')}]`
      }
    }
    if (typeof input.summary === 'string') updatePayload.summary = input.summary.trim()
    if (typeof input.title === 'string') updatePayload.title = input.title.trim()
    if (Array.isArray(input.tags))
      updatePayload.tags = input.tags.filter((t): t is string => typeof t === 'string')

    const newSourceRefs = Array.isArray(input.source_refs) ? input.source_refs : []
    if (newSourceRefs.length > 0) {
      updatePayload.source_refs = [...(existing.source_refs ?? []), ...newSourceRefs]
    }

    const { data, error } = await this.brainNarrativeRepository.updatePage(target.serviceClient, {
      pageId,
      payload: updatePayload,
      select: true,
    })

    if (error) return { success: false, error: `Failed to update page: ${error.message}` }
    if (contentMd !== null) {
      const dirSuffix = await this.resolveBrainDirSuffix(target, existing.brain_id)
      this.writePageToDisk(target, existing.slug, contentMd, dirSuffix)
    }
    return { success: true, page: data }
  }

  async archiveNarrativePage(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    ensureAtlasNarrativeWriter: NarrativeWriterGuard,
    resolveNarrativeBrainId: NarrativeBrainResolver,
  ) {
    const writerCheck = ensureAtlasNarrativeWriter(target, sessionKey)
    if (writerCheck) return writerCheck
    const pageId = typeof input.id === 'string' ? input.id.trim() : ''
    if (!pageId) return { success: false, error: 'id is required' }

    const { data: page } = await this.brainNarrativeRepository.findPage(target.serviceClient, {
      pageId,
      columns: 'slug, brain_id',
    })
    const archiveTarget = await resolveNarrativeBrainId(
      target,
      input,
      target.resolveUserId(sessionKey),
      sessionKey,
      'train',
    )
    if ('error' in archiveTarget) return { success: false, error: archiveTarget.error }
    if (!page || page.brain_id !== archiveTarget.brainId) {
      return { success: false, error: 'Page does not belong to the requested brain target' }
    }

    const { error } = await this.brainNarrativeRepository.updatePage(target.serviceClient, {
      pageId,
      payload: { status: 'archived', updated_at: new Date().toISOString() },
    })
    if (error) return { success: false, error: `Failed to archive page: ${error.message}` }

    if (page?.slug) {
      const dirSuffix = await this.resolveBrainDirSuffix(target, page.brain_id)
      this.deletePageFromDisk(target, page.slug, dirSuffix)
    }
    return { success: true, archived: pageId }
  }

  async linkNarrativePages(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    ensureAtlasNarrativeWriter: NarrativeWriterGuard,
    resolveNarrativeBrainId: NarrativeBrainResolver,
  ) {
    const writerCheck = ensureAtlasNarrativeWriter(target, sessionKey)
    if (writerCheck) return writerCheck
    const fromId = typeof input.from_page_id === 'string' ? input.from_page_id.trim() : ''
    const toId = typeof input.to_page_id === 'string' ? input.to_page_id.trim() : ''
    if (!fromId || !toId)
      return { success: false, error: 'from_page_id and to_page_id are required' }
    const linkTarget = await resolveNarrativeBrainId(
      target,
      input,
      target.resolveUserId(sessionKey),
      sessionKey,
      'train',
    )
    if ('error' in linkTarget) return { success: false, error: linkTarget.error }
    const { data: linkPages } = await this.brainNarrativeRepository.listPagesByIds(
      target.serviceClient,
      [fromId, toId],
    )
    if (
      !Array.isArray(linkPages) ||
      linkPages.length !== 2 ||
      linkPages.some((page: { brain_id?: string }) => page.brain_id !== linkTarget.brainId)
    ) {
      return { success: false, error: 'Both pages must belong to the requested brain target' }
    }

    const linkType = typeof input.link_type === 'string' ? input.link_type.trim() : 'related'
    const { data, error } = await this.brainNarrativeRepository.upsertPageLink(
      target.serviceClient,
      { from_page_id: fromId, to_page_id: toId, link_type: linkType },
    )
    if (error) return { success: false, error: `Failed to link pages: ${error.message}` }
    return { success: true, link: data }
  }

  async unlinkNarrativePages(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    ensureAtlasNarrativeWriter: NarrativeWriterGuard,
    resolveNarrativeBrainId: NarrativeBrainResolver,
  ) {
    const writerCheck = ensureAtlasNarrativeWriter(target, sessionKey)
    if (writerCheck) return writerCheck
    const fromId = typeof input.from_page_id === 'string' ? input.from_page_id.trim() : ''
    const toId = typeof input.to_page_id === 'string' ? input.to_page_id.trim() : ''
    if (!fromId || !toId)
      return { success: false, error: 'from_page_id and to_page_id are required' }
    const unlinkTarget = await resolveNarrativeBrainId(
      target,
      input,
      target.resolveUserId(sessionKey),
      sessionKey,
      'train',
    )
    if ('error' in unlinkTarget) return { success: false, error: unlinkTarget.error }
    const { data: unlinkPages } = await this.brainNarrativeRepository.listPagesByIds(
      target.serviceClient,
      [fromId, toId],
    )
    if (
      !Array.isArray(unlinkPages) ||
      unlinkPages.length !== 2 ||
      unlinkPages.some((page: { brain_id?: string }) => page.brain_id !== unlinkTarget.brainId)
    ) {
      return { success: false, error: 'Both pages must belong to the requested brain target' }
    }

    const { error } = await this.brainNarrativeRepository.deletePageLink(target.serviceClient, {
      fromId,
      toId,
    })
    if (error) return { success: false, error: `Failed to unlink pages: ${error.message}` }
    return { success: true, unlinked: { from: fromId, to: toId } }
  }

  async getBrainLog(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    resolveNarrativeBrainId: NarrativeBrainResolver,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const resolved = await resolveNarrativeBrainId(target, input, userId, sessionKey, 'query')
    if ('error' in resolved) return { success: false, error: resolved.error }
    const brainId = resolved.brainId

    const eventType = typeof input.event_type === 'string' ? input.event_type.trim() : null
    const limit = typeof input.limit === 'number' ? Math.min(input.limit, 50) : 10
    const { data, error } = await this.brainNarrativeRepository.listBrainLog(target.serviceClient, {
      brainId,
      eventType,
      limit,
    })
    if (error) return { success: false, error: `Failed to read brain log: ${error.message}` }
    return { success: true, count: (data ?? []).length, entries: data ?? [] }
  }

  async logBrainEvent(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    resolveNarrativeBrainId: NarrativeBrainResolver,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const resolved = await resolveNarrativeBrainId(target, input, userId, sessionKey, 'train')
    if ('error' in resolved) return { success: false, error: resolved.error }
    const brainId = resolved.brainId

    const eventType = typeof input.event_type === 'string' ? input.event_type.trim() : ''
    const summary = typeof input.summary === 'string' ? input.summary.trim() : ''
    if (!eventType) return { success: false, error: 'event_type is required' }
    if (!summary) return { success: false, error: 'summary is required' }

    const affectedPages = Array.isArray(input.affected_pages)
      ? input.affected_pages.filter((p): p is string => typeof p === 'string')
      : []
    const sourceRef =
      input.source_ref && typeof input.source_ref === 'object' ? input.source_ref : null
    const metadata = input.metadata && typeof input.metadata === 'object' ? input.metadata : {}

    const { data, error } = await this.brainNarrativeRepository.logBrainEvent(
      target.serviceClient,
      {
        brain_id: brainId,
        event_type: eventType,
        summary,
        affected_pages: affectedPages,
        source_ref: sourceRef,
        metadata,
      },
    )
    if (error) return { success: false, error: `Failed to log brain event: ${error.message}` }
    return { success: true, entry: data }
  }

  private listSections(md: string): string[] {
    const headingRegex = /^#{1,4}\s+(.+)$/gm
    const sections: string[] = []
    let match: RegExpExecArray | null
    while ((match = headingRegex.exec(md)) !== null) {
      sections.push(match[1].trim())
    }
    return sections
  }

  private findSectionRange(md: string, sectionName: string): { start: number; end: number } | null {
    const lines = md.split('\n')
    const lowerTarget = sectionName.toLowerCase().replace(/^#+\s*/, '')
    let sectionStart = -1
    let sectionHeadingLevel = 0

    for (let i = 0; i < lines.length; i++) {
      const headingMatch = lines[i].match(/^(#{1,4})\s+(.+)$/)
      if (!headingMatch) continue
      const level = headingMatch[1].length
      const name = headingMatch[2].trim().toLowerCase()

      if (sectionStart === -1 && name === lowerTarget) {
        sectionStart = i
        sectionHeadingLevel = level
        continue
      }
      if (sectionStart !== -1 && level <= sectionHeadingLevel) {
        return { start: sectionStart, end: i }
      }
    }
    if (sectionStart !== -1) return { start: sectionStart, end: lines.length }
    return null
  }

  private appendToSection(md: string, sectionName: string, content: string): string {
    const range = this.findSectionRange(md, sectionName)
    if (!range) return md
    const lines = md.split('\n')
    let insertAt = range.end
    while (insertAt > range.start + 1 && lines[insertAt - 1].trim() === '') insertAt--
    lines.splice(insertAt, 0, '', content)
    return lines.join('\n')
  }

  private replaceSection(md: string, sectionName: string, content: string): string {
    const range = this.findSectionRange(md, sectionName)
    if (!range) return md
    const lines = md.split('\n')
    const headingLine = lines[range.start]
    lines.splice(range.start, range.end - range.start, headingLine, '', content)
    return lines.join('\n')
  }

  private addSection(md: string, heading: string, content: string, after: string | null): string {
    const lines = md.split('\n')
    if (after) {
      const range = this.findSectionRange(md, after)
      if (range) {
        lines.splice(range.end, 0, '', `## ${heading}`, '', content)
        return lines.join('\n')
      }
    }
    lines.push('', `## ${heading}`, '', content)
    return lines.join('\n')
  }

  private async resolveBrainDirSuffix(
    target: Record<string, any>,
    brainId: string,
  ): Promise<string> {
    try {
      const { data } = await this.brainScholarRepository.findBrainDirInfo(
        target.serviceClient,
        brainId,
      )
      if (data?.agent_id) return `brain-${data.agent_id}`
      if (data?.campaign_id) return `brain-campaign-${String(data.campaign_id).slice(0, 8)}`
    } catch {
      // fall through to default
    }
    return 'brain'
  }

  private writePageToDisk(
    target: Record<string, any>,
    slug: string,
    contentMd: string,
    brainDirSuffix?: string,
  ): void {
    try {
      const agentKey = target.config?.agentKey ?? 'atlas'
      const basePath = process.env.AGENTS_BASE_DIR ?? '/app/agents'
      const brainDir = `${basePath}/${agentKey}/${brainDirSuffix ?? 'brain'}`
      const fs = require('fs')
      fs.mkdirSync(brainDir, { recursive: true })
      fs.writeFileSync(`${brainDir}/${slug}.md`, contentMd, 'utf-8')
    } catch {
      // workspace file write is best-effort; DB is source of truth
    }
  }

  private deletePageFromDisk(
    target: Record<string, any>,
    slug: string,
    brainDirSuffix?: string,
  ): void {
    try {
      const agentKey = target.config?.agentKey ?? 'atlas'
      const basePath = process.env.AGENTS_BASE_DIR ?? '/app/agents'
      const filePath = `${basePath}/${agentKey}/${brainDirSuffix ?? 'brain'}/${slug}.md`
      const fs = require('fs')
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    } catch {
      // best-effort
    }
  }
}
