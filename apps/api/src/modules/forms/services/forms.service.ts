import { randomUUID } from 'node:crypto'
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { VercelIntegration } from '../../domains/integrations/vercel.integration'
import { SpacesService } from '../../spaces/services/spaces.service'
import type { CreateFormDto, SubmitFormDto, UpdateFormDto } from '../dto'
import { FormResponsesRepository } from '../repositories/form-responses.repository'
import { FormsRuntimeRepository } from '../repositories/forms-runtime.repository'
import { FormsRepository } from '../repositories/forms.repository'
import { FormContactAnswerService } from './form-contact-answer.service'
import { resolveFormTaskTitle } from './form-task-title'

type FormRow = Record<string, any>
type FormQuestion = {
  id: string
  type: string
  label?: string
  required?: boolean
  hidden?: boolean
  property_field_id?: string
}

@Injectable()
export class FormsService {
  private readonly logger = new Logger(FormsService.name)

  constructor(
    private readonly formsRepo: FormsRepository,
    private readonly responsesRepo: FormResponsesRepository,
    private readonly spacesService: SpacesService,
    private readonly formContactAnswers: FormContactAnswerService,
    private readonly vercelIntegration: VercelIntegration,
    private readonly formsRuntime: FormsRuntimeRepository = new FormsRuntimeRepository(),
  ) {}

  async listForms(
    supabase: SupabaseClient,
    campaignId: string,
    orgId?: string | null,
    opts?: { spaceId?: string | null },
  ) {
    return this.formsRepo.findByCampaignId(supabase, campaignId, orgId, opts)
  }

  async listAggregates(
    supabase: SupabaseClient,
    campaignId: string,
    orgId?: string | null,
    opts?: { spaceId?: string | null },
  ) {
    const forms = await this.formsRepo.findByCampaignId(supabase, campaignId, orgId, opts)
    const responseAggregates = await this.responsesRepo.findAggregatesByCampaignId(
      supabase,
      campaignId,
      opts?.spaceId !== undefined
        ? { formIds: forms.map((f) => String((f as { id: string }).id)) }
        : undefined,
    )
    const responsesByFormId = new Map(
      responseAggregates.map((entry) => [entry.form_id, entry] as const),
    )
    const targetSpaceIds = Array.from(
      new Set(
        forms
          .map((form) => {
            const settings =
              form.settings && typeof form.settings === 'object' && !Array.isArray(form.settings)
                ? (form.settings as Record<string, unknown>)
                : {}
            const target = settings.target_space_id
            return typeof target === 'string' && target ? target : (form.space_id as string | null)
          })
          .filter((id): id is string => Boolean(id)),
      ),
    )
    let spaceNamesById = new Map<string, string>()
    if (targetSpaceIds.length > 0) {
      const rows = await this.formsRuntime.listSpaceTitlesByIds(supabase, targetSpaceIds)
      spaceNamesById = new Map(
        rows.map((row) => [row.id, row.title ?? '']),
      )
    }
    return forms.map((form) => {
      const formId = String(form.id)
      const aggregate = responsesByFormId.get(formId)
      const settings =
        form.settings && typeof form.settings === 'object' && !Array.isArray(form.settings)
          ? (form.settings as Record<string, unknown>)
          : {}
      const target =
        (typeof settings.target_space_id === 'string' && settings.target_space_id) ||
        (form.space_id as string | null) ||
        null
      return {
        form_id: formId,
        responses_count: aggregate?.responses_count ?? 0,
        last_response_at: aggregate?.last_response_at ?? null,
        target_space_id: target,
        target_space_name: target ? (spaceNamesById.get(target) ?? null) : null,
      }
    })
  }

  async getForm(supabase: SupabaseClient, id: string, orgId?: string | null) {
    const form = await this.formsRepo.findById(supabase, id, orgId)
    if (!form) throw new NotFoundException('Form not found')
    return form
  }

  async createForm(
    supabase: SupabaseClient,
    userId: string,
    dto: CreateFormDto,
    orgId?: string | null,
  ) {
    return this.formsRepo.create(supabase, userId, dto, orgId)
  }

  async updateForm(
    supabase: SupabaseClient,
    id: string,
    dto: UpdateFormDto,
    orgId?: string | null,
  ) {
    const form = await this.formsRepo.findById(supabase, id, orgId)
    if (!form) throw new NotFoundException('Form not found')
    return this.formsRepo.update(supabase, id, dto)
  }

  async deleteForm(supabase: SupabaseClient, id: string, orgId?: string | null) {
    const form = await this.formsRepo.findById(supabase, id, orgId)
    if (!form) throw new NotFoundException('Form not found')
    await this.formsRepo.delete(supabase, id)
  }

  async publishForm(supabase: SupabaseClient, id: string, orgId?: string | null) {
    const form = await this.formsRepo.findById(supabase, id, orgId)
    if (!form) throw new NotFoundException('Form not found')

    const serviceClient = this.formsRuntime.createServiceClient()
    const slug = await this.ensureSlug(serviceClient, form)
    const userId = String(form.user_id)
    const subdomain = await this.ensureUserSubdomain(userId, orgId ?? null)
    const tokenOrSlug = (typeof form.share_token === 'string' && form.share_token) || slug
    const publishedUrl = `https://${subdomain}/form/${tokenOrSlug}`

    await this.formsRepo.update(supabase, id, {
      slug,
      status: 'published',
      published_url: publishedUrl,
    })

    return { success: true, status: 'published', slug, url: publishedUrl }
  }

  /**
   * Mirrors `FunnelsService.ensureUserSubdomain` — generates `user-{shortId}.vibeyfunnels.com`
   * (or `-{suffix}` on collision), inserts a verified `domains` row, and registers the subdomain
   * with Vercel so SSL is provisioned.
   */
  private async ensureUserSubdomain(userId: string, orgId: string | null): Promise<string> {
    const serviceClient = this.formsRuntime.createServiceClient()

    const existing = await this.formsRuntime.findGeneratedDomain(serviceClient, userId)

    if (existing) {
      return existing.domain_name as string
    }

    const baseDomain = process.env.CLOUDFLARE_BASE_DOMAIN || 'vibeyfunnels.com'
    let subdomain = `user-${userId.slice(0, 8)}.${baseDomain}`

    const conflict = await this.formsRuntime.findDomainConflict(serviceClient, subdomain)

    if (conflict) {
      const suffix = Math.random().toString(36).slice(2, 6)
      subdomain = `user-${userId.slice(0, 8)}-${suffix}.${baseDomain}`
    }

    await this.formsRuntime.insertGeneratedDomain(serviceClient, {
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

  async unpublishForm(supabase: SupabaseClient, id: string, orgId?: string | null) {
    const form = await this.formsRepo.findById(supabase, id, orgId)
    if (!form) throw new NotFoundException('Form not found')
    await this.formsRepo.update(supabase, id, { status: 'draft' })
    return { success: true, status: 'draft' }
  }

  async listResponses(supabase: SupabaseClient, id: string, orgId?: string | null) {
    const form = await this.formsRepo.findById(supabase, id, orgId)
    if (!form) throw new NotFoundException('Form not found')
    return this.responsesRepo.findByFormId(supabase, id)
  }

  async getPublicForm(token: string) {
    const supabase = this.formsRuntime.createServiceClient()
    const form = await this.formsRepo.findPublishedByToken(supabase, token)
    if (!form) throw new NotFoundException('Form not found')
    return {
      id: form.id,
      name: form.name,
      schema: form.schema,
      settings: this.publicSettings(form.settings),
      visibility: form.visibility,
      status: form.status,
    }
  }

  async submitPublicForm(
    token: string,
    dto: SubmitFormDto,
    meta: { ip?: string | null; userAgent?: string | null },
  ) {
    const supabase = this.formsRuntime.createServiceClient()
    const form = await this.formsRepo.findPublishedByToken(supabase, token)
    if (!form) throw new NotFoundException('Form not found')
    if (form.visibility === 'auth') throw new BadRequestException('This form requires sign in')

    await this.verifyCaptchaIfEnabled(form, dto.turnstile_token, meta.ip ?? null)

    const questions = this.getQuestions(form)
    this.validateAnswers(questions, dto.answers)

    const spaceId = this.resolveTargetSpaceId(form)
    if (!spaceId) throw new BadRequestException('Form is missing a target space')

    const settings =
      form.settings && typeof form.settings === 'object' && !Array.isArray(form.settings)
        ? (form.settings as Record<string, unknown>)
        : {}
    const title = resolveFormTaskTitle({
      formName: String(form.name ?? 'Form'),
      questions,
      answers: dto.answers,
      taskTitleQuestionId: settings.task_title_question_id,
    })
    const customData = await this.formContactAnswers.buildCustomData(
      supabase,
      form,
      questions,
      dto.answers,
    )
    const assignee = this.resolveAssignee(form)
    const description = this.shouldAddAnswersToDescription(form)
      ? this.buildAnswersDescription(questions, dto.answers)
      : null
    const item = await this.spacesService.createItem(
      supabase,
      String(form.user_id),
      spaceId,
      {
        title,
        source: 'manual',
        form_id: form.id,
        ...(assignee
          ? {
              assignee_type: assignee.type,
              assignee_id: assignee.id,
            }
          : {}),
        ...(description ? { description } : {}),
        custom_data: {
          ...customData,
          _source: 'form',
        },
      },
      (form.org_id as string | null) ?? null,
      null,
    )

    const response = await this.responsesRepo.create(supabase, {
      form_id: form.id,
      org_id: (form.org_id as string | null) ?? null,
      campaign_id: (form.campaign_id as string | null) ?? null,
      space_item_id: String(item.id),
      answers: dto.answers,
      submitter_email: this.formContactAnswers.resolveSubmitterEmail(dto.answers),
      submitter_user_id: null,
      ip: meta.ip ?? null,
      user_agent: meta.userAgent ?? null,
    })

    await this.formsRepo.update(supabase, form.id, {
      settings: form.settings,
    })

    return {
      ok: true,
      response_id: response.id,
      space_item_id: item.id,
      redirect_url: this.resolveRedirectUrl(form),
    }
  }

  private async ensureSlug(supabase: SupabaseClient, form: FormRow): Promise<string> {
    if (typeof form.slug === 'string' && form.slug.trim()) return form.slug
    const base = String(form.name ?? 'form')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60)
    let slug = base || 'form'
    const conflict = await this.formsRepo.findSlugConflict(
      supabase,
      form.campaign_id,
      slug,
      form.id,
    )
    if (conflict) slug = `${slug}-${randomUUID().slice(0, 8)}`
    return slug
  }

  private getQuestions(form: FormRow): FormQuestion[] {
    const schema = form.schema && typeof form.schema === 'object' ? form.schema : {}
    return Array.isArray(schema.questions) ? (schema.questions as FormQuestion[]) : []
  }

  private validateAnswers(questions: FormQuestion[], answers: Record<string, unknown>): void {
    for (const question of questions) {
      if (question.hidden) continue
      if (!question.required) continue
      const value = answers[question.id]
      if (value === undefined || value === null || value === '') {
        throw new BadRequestException(`${question.label || 'Question'} is required`)
      }
      if (Array.isArray(value) && value.length === 0) {
        throw new BadRequestException(`${question.label || 'Question'} is required`)
      }
    }
  }

  private resolveTargetSpaceId(form: FormRow): string | null {
    const settings = form.settings && typeof form.settings === 'object' ? form.settings : {}
    const target = (settings as Record<string, unknown>).target_space_id
    return typeof target === 'string' && target
      ? target
      : ((form.space_id as string | null) ?? null)
  }

  private async verifyCaptchaIfEnabled(
    form: FormRow,
    turnstileToken: string | undefined,
    remoteIp: string | null,
  ): Promise<void> {
    const settings = form.settings && typeof form.settings === 'object' ? form.settings : {}
    const required = (settings as Record<string, unknown>).show_recaptcha === true
    if (!required) return

    const secret = process.env.TURNSTILE_SECRET_KEY
    if (!secret) {
      throw new BadRequestException(
        'CAPTCHA is enabled on this form but the server is not configured',
      )
    }
    if (!turnstileToken) {
      throw new BadRequestException('CAPTCHA verification token is required')
    }

    const params = new URLSearchParams()
    params.set('secret', secret)
    params.set('response', turnstileToken)
    if (remoteIp) params.set('remoteip', remoteIp)

    let result: { success?: boolean; 'error-codes'?: string[] } = {}
    try {
      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: params,
      })
      result = (await response.json().catch(() => ({}))) as typeof result
    } catch {
      throw new BadRequestException('CAPTCHA verification failed (network error)')
    }
    if (!result.success) {
      throw new BadRequestException('CAPTCHA verification failed')
    }
  }

  private shouldAddAnswersToDescription(form: FormRow): boolean {
    const settings = form.settings && typeof form.settings === 'object' ? form.settings : {}
    return (settings as Record<string, unknown>).add_answers_to_description === true
  }

  private buildAnswersDescription(
    questions: FormQuestion[],
    answers: Record<string, unknown>,
  ): string | null {
    const lines: string[] = []
    for (const question of questions) {
      if (question.hidden) continue
      if (question.type === 'info_block') continue
      const label = question.label?.trim() || 'Question'
      const formatted = this.formatAnswerForText(answers[question.id])
      lines.push(`${label}: ${formatted}`)
    }
    if (lines.length === 0) return null
    return lines.join('\n').slice(0, 20000)
  }

  private formatAnswerForText(value: unknown): string {
    if (value === null || value === undefined || value === '') return '—'
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      // Collapse newlines so each question stays on one line.
      return String(value).replace(/\s*\n+\s*/g, ' / ')
    }
    if (Array.isArray(value)) {
      return value.length === 0
        ? '—'
        : value.map((entry) => this.formatAnswerForText(entry)).join(', ')
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>).filter(
        ([, raw]) => raw !== null && raw !== undefined && raw !== '',
      )
      if (entries.length === 0) return '—'
      return entries.map(([k, v]) => `${k}: ${this.formatAnswerForText(v)}`).join(', ')
    }
    return String(value)
  }

  private resolveAssignee(form: FormRow): { type: 'human' | 'agent'; id: string } | null {
    const settings = form.settings && typeof form.settings === 'object' ? form.settings : {}
    const source = settings as Record<string, unknown>
    const rawType = source.assignee_type
    const rawId = source.assignee_id
    if ((rawType !== 'human' && rawType !== 'agent') || typeof rawId !== 'string' || !rawId) {
      return null
    }
    return { type: rawType, id: rawId }
  }

  private resolveRedirectUrl(form: FormRow): string | null {
    const settings = form.settings && typeof form.settings === 'object' ? form.settings : {}
    const redirect = (settings as Record<string, unknown>).redirect_url
    return typeof redirect === 'string' && redirect.trim() ? redirect.trim() : null
  }

  private publicSettings(settings: unknown) {
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return {}
    const source = settings as Record<string, unknown>
    return {
      layout: source.layout,
      theme: source.theme,
      colors: source.colors,
      button_label: source.button_label,
      redirect_url: source.redirect_url,
      hide_branding: source.hide_branding,
    }
  }

}
