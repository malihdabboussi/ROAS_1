import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ContactIdentifierService } from '../../leads/services/contact-identifier.service'
import { FormsRuntimeRepository } from '../repositories/forms-runtime.repository'

type FormRow = Record<string, any>
type FormQuestion = {
  id: string
  type: string
  hidden?: boolean
  property_field_id?: string
}

@Injectable()
export class FormContactAnswerService {
  constructor(
    private readonly contactIdentifier: ContactIdentifierService,
    private readonly formsRuntime: FormsRuntimeRepository = new FormsRuntimeRepository(),
  ) {}

  async buildCustomData(
    supabase: SupabaseClient,
    form: FormRow,
    questions: FormQuestion[],
    answers: Record<string, unknown>,
  ) {
    const out: Record<string, unknown> = {}
    for (const question of questions) {
      if (question.hidden) continue
      if (!question.property_field_id || question.property_field_id === 'title') continue
      if (question.type === 'info_block') continue
      if (question.type === 'contact') {
        out[question.property_field_id] = await this.resolveContactIdForAnswer(
          supabase,
          form,
          answers[question.id],
        )
        continue
      }
      out[question.property_field_id] = answers[question.id] ?? null
    }
    return out
  }

  resolveSubmitterEmail(answers: Record<string, unknown>): string | null {
    for (const value of Object.values(answers)) {
      if (typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return value
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const email = (value as Record<string, unknown>).email
        if (typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return email
      }
    }
    return null
  }

  private async resolveContactIdForAnswer(
    supabase: SupabaseClient,
    form: FormRow,
    value: unknown,
  ): Promise<string | null> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const source = value as Record<string, unknown>
    const str = (key: string): string => {
      const raw = source[key]
      return typeof raw === 'string' ? raw.trim() : ''
    }

    const rawName = str('name')
    const email = str('email').toLowerCase()
    const phone = str('phone')
    let firstName = str('first_name')
    let lastName = str('last_name')
    if (!firstName && !lastName && rawName) {
      const [first, ...rest] = rawName.split(/\s+/).filter(Boolean)
      firstName = first ?? ''
      lastName = rest.join(' ')
    }

    const formOwner = {
      userId: String(form.user_id),
      orgId: (form.org_id as string | null) ?? null,
    }
    const formDetail =
      typeof form.title === 'string' && form.title.trim() ? form.title.trim() : null

    let contactId: string | null = null
    if (email) {
      const contact = await this.contactIdentifier.findOrCreateContact(supabase, {
        ...formOwner,
        kind: 'email',
        value: email,
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        channel: 'form',
        detail: formDetail,
      })
      if (phone) {
        await this.contactIdentifier.attachIdentifier(supabase, {
          contactId: contact.id,
          owner: formOwner,
          kind: 'phone',
          value: phone,
          source: 'form',
        })
      }
      contactId = contact.id
    } else if (phone) {
      const contact = await this.contactIdentifier.findOrCreateContact(supabase, {
        ...formOwner,
        kind: 'phone',
        value: phone,
        email: null,
        firstName: firstName || null,
        lastName: lastName || null,
        channel: 'form',
        detail: formDetail,
      })
      contactId = contact.id
    }

    if (!contactId) return null

    const extras: Record<string, string | null> = {}
    if (phone) extras.phone = phone
    const businessName = str('business_name')
    if (businessName) extras.business_name = businessName
    const website = str('website')
    if (website) extras.website = website
    const city = str('city')
    if (city) extras.city = city
    const state = str('state')
    if (state) extras.state = state
    const country = str('country')
    if (country) extras.country = country

    if (Object.keys(extras).length > 0) {
      await this.applyContactExtras(supabase, contactId, extras)
    }

    return contactId
  }

  private async applyContactExtras(
    supabase: SupabaseClient,
    contactId: string,
    extras: Record<string, string | null>,
  ): Promise<void> {
    const keys = Object.keys(extras)
    const existing = await this.formsRuntime.findContactFields(supabase, contactId, keys)
    const patch: Record<string, string | null> = {}
    for (const key of keys) {
      const current = existing[key]
      if (current === null || current === undefined || current === '') {
        patch[key] = extras[key]
      }
    }
    if (Object.keys(patch).length === 0) return
    await this.formsRuntime.updateContactFields(supabase, contactId, patch)
  }
}
