import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ArtifactContactsRepository,
  type ArtifactContactCreateInput,
  type ArtifactContactListInput,
} from '../repositories/artifact-contacts.repository'
import { ArtifactContactNotesRepository } from '../repositories/artifact-contact-notes.repository'
import { ArtifactContactTimelineRepository } from '../repositories/artifact-contact-timeline.repository'
import type { ArtifactActionHandler } from './artifact-action.registry'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CONTACT_CHANNELS = [
  'funnel',
  'form',
  'widget',
  'telegram',
  'import',
  'manual',
  'automation',
  'integration',
] as const

const CONTACT_UPDATE_FIELDS = [
  'first_name',
  'last_name',
  'phone',
  'email',
  'tags',
  'custom_fields',
  'source',
  'business_name',
  'website',
  'address',
  'city',
  'state',
  'country',
  'contact_type',
  'contact_type_source',
  'contact_type_confidence',
  'contact_type_set_at',
  'contact_source',
  'contact_source_detail',
] as const

const NOTE_CARD_TINTS = new Set([
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'slate',
])

@Injectable()
export class ArtifactContactsService {
  constructor(
    private readonly contactsRepository: ArtifactContactsRepository = new ArtifactContactsRepository(),
    private readonly contactTimelineRepository: ArtifactContactTimelineRepository = new ArtifactContactTimelineRepository(),
    private readonly contactNotesRepository: ArtifactContactNotesRepository = new ArtifactContactNotesRepository(),
  ) {}

  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      list_contacts: (data, sessionKey) => this.listContacts(target, data, sessionKey),
      get_contact: (data, sessionKey) => this.getContact(target, data, sessionKey),
      create_contact: (data, sessionKey) => this.createContact(target, data, sessionKey),
      update_contact: (data, sessionKey) => this.updateContact(target, data, sessionKey),
      add_contact_note: (data, sessionKey) => this.addContactNote(target, data, sessionKey),
      update_contact_note: (data, sessionKey) =>
        this.updateContactNote(target, data, sessionKey),
      get_contact_activity: (data, sessionKey) =>
        this.getContactActivity(target, data, sessionKey),
      list_contact_communications: (data, sessionKey) =>
        this.listContactCommunications(target, data, sessionKey),
    }
  }

  private resolveContext(target: Record<string, any>, sessionKey?: string) {
    const userId = target.resolveUserId(sessionKey)
    const orgId = (target.resolveOrgId?.(sessionKey) as string | null | undefined) ?? null
    return { userId, orgId }
  }

  private async getUserClient(
    target: Record<string, any>,
    userId: string,
    sessionKey?: string,
  ): Promise<SupabaseClient> {
    return (await target.getUserClient(userId, sessionKey as string)) as SupabaseClient
  }

  private missingOrg(): { success: false; error: string } {
    return {
      success: false,
      error: 'Contacts actions require an organization scope.',
    }
  }

  private cleanString(value: unknown, max = 500): string | null {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    if (!trimmed) return null
    return trimmed.slice(0, max)
  }

  private parseLimit(value: unknown, fallback = 50, max = 100): number {
    const parsed = Number(value ?? fallback)
    if (!Number.isFinite(parsed)) return fallback
    return Math.min(Math.max(Math.trunc(parsed), 1), max)
  }

  private parseOffset(value: unknown): number {
    const parsed = Number(value ?? 0)
    if (!Number.isFinite(parsed)) return 0
    return Math.max(Math.trunc(parsed), 0)
  }

  private parseCommunicationChannel(value: unknown): string | null {
    const channel = this.cleanString(value, 30)
    if (!channel) return null
    return ['email', 'widget', 'telegram', 'app'].includes(channel) ? channel : null
  }

  private noteId(data: Record<string, unknown>): string | null {
    return this.cleanString(data.note_id, 200)
  }

  private noteContent(value: unknown): string | null {
    return this.cleanString(value, 10000)
  }

  private parseNoteTint(
    data: Record<string, unknown>,
  ): { ok: true; value?: string | null } | { ok: false; error: string } {
    const hasTint =
      Object.prototype.hasOwnProperty.call(data, 'card_tint') ||
      Object.prototype.hasOwnProperty.call(data, 'cardTint')
    if (!hasTint) return { ok: true }

    const raw = data.card_tint ?? data.cardTint
    if (raw === null) return { ok: true, value: null }
    const tint = this.cleanString(raw, 30)
    if (!tint) return { ok: true, value: null }
    if (!NOTE_CARD_TINTS.has(tint)) {
      return {
        ok: false,
        error: `card_tint must be one of: ${Array.from(NOTE_CARD_TINTS).join(', ')}`,
      }
    }
    return { ok: true, value: tint }
  }

  private parseFilters(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    return value as Record<string, unknown>
  }

  private contactId(data: Record<string, unknown>): string | null {
    return this.cleanString(data.contact_id ?? data.id, 200)
  }

  private normalizeCreateInput(
    userId: string,
    orgId: string,
    data: Record<string, unknown>,
  ): { ok: true; value: ArtifactContactCreateInput } | { ok: false; error: string } {
    const email = this.cleanString(data.email, 320)?.toLowerCase()
    if (!email || !EMAIL_RE.test(email)) {
      return { ok: false, error: 'A valid email is required.' }
    }
    return {
      ok: true,
      value: {
        userId,
        orgId,
        email,
        firstName: this.cleanString(data.first_name, 200),
        lastName: this.cleanString(data.last_name, 200),
        phone: this.cleanString(data.phone, 30),
      },
    }
  }

  private pickUpdates(data: Record<string, unknown>): Record<string, unknown> {
    const updates: Record<string, unknown> = {}
    for (const key of CONTACT_UPDATE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(data, key)) updates[key] = data[key]
    }
    if (typeof updates.email === 'string') {
      const email = updates.email.trim().toLowerCase()
      updates.email = email || null
    }
    return updates
  }

  private validateUpdates(updates: Record<string, unknown>): string | null {
    if (Object.keys(updates).length === 0) return 'At least one contact field is required.'
    if (typeof updates.email === 'string' && !EMAIL_RE.test(updates.email)) {
      return 'email must be a valid email address.'
    }
    if (
      updates.contact_source !== undefined &&
      updates.contact_source !== null &&
      !CONTACT_CHANNELS.includes(updates.contact_source as (typeof CONTACT_CHANNELS)[number])
    ) {
      return `contact_source must be one of: ${CONTACT_CHANNELS.join(', ')}`
    }
    return null
  }

  private normalizeListInput(
    orgId: string,
    data: Record<string, unknown>,
  ): ArtifactContactListInput {
    return {
      orgId,
      search: this.cleanString(data.search ?? data.query, 200),
      sort: this.cleanString(data.sort, 100),
      limit: this.parseLimit(data.limit, 50, 100),
      offset: this.parseOffset(data.offset),
      filters: this.parseFilters(data.filters),
      includeArchived: data.include_archived === true || data.includeArchived === true,
      contactType: this.cleanString(data.contact_type ?? data.contactType, 100),
      campaignId: this.cleanString(data.campaign_id ?? data.campaignId, 100),
    }
  }

  async listContacts(target: Record<string, any>, data: Record<string, unknown>, sessionKey?: string) {
    const { userId, orgId } = this.resolveContext(target, sessionKey)
    if (!orgId) return this.missingOrg()

    const supabase = await this.getUserClient(target, userId, sessionKey)
    const input = this.normalizeListInput(orgId, data)
    const result = await this.contactsRepository.listContacts(supabase, input)
    return {
      success: true,
      contacts: result.data ?? [],
      total: result.count ?? 0,
      hasMore: result.hasMore,
      limit: input.limit,
      offset: input.offset,
    }
  }

  async getContact(target: Record<string, any>, data: Record<string, unknown>, sessionKey?: string) {
    const { userId, orgId } = this.resolveContext(target, sessionKey)
    if (!orgId) return this.missingOrg()

    const contactId = this.contactId(data)
    if (!contactId) return { success: false, error: 'contact_id is required.' }

    const supabase = await this.getUserClient(target, userId, sessionKey)
    const result = await this.contactsRepository.findContactById(supabase, { contactId, orgId })
    if (result.error) throw new Error(`DB error: ${result.error.message}`)
    if (!result.data) return { success: false, error: 'Contact not found.' }
    return { success: true, contact: result.data }
  }

  async getContactActivity(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const { userId, orgId } = this.resolveContext(target, sessionKey)
    if (!orgId) return this.missingOrg()

    const contactId = this.contactId(data)
    if (!contactId) return { success: false, error: 'contact_id is required.' }

    const supabase = await this.getUserClient(target, userId, sessionKey)
    const limit = this.parseLimit(data.limit, 100, 200)
    const offset = this.parseOffset(data.offset)
    const result = await this.contactTimelineRepository.findContactActivity(supabase, {
      contactId,
      orgId,
      limit,
      offset,
    })
    if (!result.contact) return { success: false, error: 'Contact not found.' }
    return {
      success: true,
      events: result.events,
      total: result.total,
      limit,
      offset,
      hasMore: offset + limit < result.total,
    }
  }

  async listContactCommunications(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const { userId, orgId } = this.resolveContext(target, sessionKey)
    if (!orgId) return this.missingOrg()

    const contactId = this.contactId(data)
    if (!contactId) return { success: false, error: 'contact_id is required.' }

    const channel = this.parseCommunicationChannel(data.channel)
    if (data.channel !== undefined && !channel) {
      return { success: false, error: 'channel must be one of: email, widget, telegram, app.' }
    }

    const supabase = await this.getUserClient(target, userId, sessionKey)
    const limit = this.parseLimit(data.limit, 50, 200)
    const offset = this.parseOffset(data.offset)
    const result = await this.contactTimelineRepository.listContactCommunications(supabase, {
      contactId,
      orgId,
      limit,
      offset,
      includeEmailBodies: data.include_email_bodies === true || data.includeEmailBodies === true,
      channel,
    })
    if (!result.contact) return { success: false, error: 'Contact not found.' }
    return {
      success: true,
      emails: result.emails,
      conversations: result.conversations,
      suggested_conversations: result.suggested_conversations,
      total: result.total,
      limit,
      offset,
    }
  }

  async createContact(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const { userId, orgId } = this.resolveContext(target, sessionKey)
    if (!orgId) return this.missingOrg()

    const input = this.normalizeCreateInput(userId, orgId, data)
    if (!input.ok) return { success: false, error: input.error }

    const supabase = await this.getUserClient(target, userId, sessionKey)
    const existing = await this.contactsRepository.findContactEmailForOwner(supabase, input.value)
    if (existing.error) throw new Error(`DB error: ${existing.error.message}`)
    if (existing.data) return { success: false, error: 'A contact with this email already exists.' }

    const result = await this.contactsRepository.createContact(supabase, input.value)
    if (result.error) throw new Error(`DB error: ${result.error.message}`)
    return { success: true, contact: result.data }
  }

  async updateContact(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const { userId, orgId } = this.resolveContext(target, sessionKey)
    if (!orgId) return this.missingOrg()

    const contactId = this.contactId(data)
    if (!contactId) return { success: false, error: 'contact_id is required.' }

    const updates = this.pickUpdates(data)
    const updateError = this.validateUpdates(updates)
    if (updateError) return { success: false, error: updateError }

    const supabase = await this.getUserClient(target, userId, sessionKey)
    const result = await this.contactsRepository.updateContact(supabase, {
      contactId,
      orgId,
      actorUserId: userId,
      updates,
    })
    if (result.error) throw new Error(`DB error: ${result.error.message}`)
    if (!result.data) return { success: false, error: 'Contact not found.' }
    return { success: true, contact: result.data }
  }

  async addContactNote(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const { userId, orgId } = this.resolveContext(target, sessionKey)
    if (!orgId) return this.missingOrg()

    const contactId = this.contactId(data)
    if (!contactId) return { success: false, error: 'contact_id is required.' }

    const content = this.noteContent(data.content)
    if (!content) return { success: false, error: 'content is required.' }

    const tint = this.parseNoteTint(data)
    if (!tint.ok) return { success: false, error: tint.error }

    const supabase = await this.getUserClient(target, userId, sessionKey)
    const result = await this.contactNotesRepository.addContactNote(supabase, {
      contactId,
      orgId,
      userId,
      content,
      cardTint: tint.value,
    })
    if (result.error) throw new Error(`DB error: ${result.error.message}`)
    if (!result.data) return { success: false, error: 'Contact not found.' }
    return { success: true, note: result.data }
  }

  async updateContactNote(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const { userId, orgId } = this.resolveContext(target, sessionKey)
    if (!orgId) return this.missingOrg()

    const contactId = this.contactId(data)
    if (!contactId) return { success: false, error: 'contact_id is required.' }
    const noteId = this.noteId(data)
    if (!noteId) return { success: false, error: 'note_id is required.' }

    const updates: { content?: string; card_tint?: string | null } = {}
    if (Object.prototype.hasOwnProperty.call(data, 'content')) {
      const content = this.noteContent(data.content)
      if (!content) return { success: false, error: 'content cannot be empty.' }
      updates.content = content
    }

    const tint = this.parseNoteTint(data)
    if (!tint.ok) return { success: false, error: tint.error }
    if (tint.value !== undefined) updates.card_tint = tint.value

    if (Object.keys(updates).length === 0) {
      return { success: false, error: 'At least one note field is required.' }
    }

    const supabase = await this.getUserClient(target, userId, sessionKey)
    const orgRole =
      typeof target.resolveOrgRole === 'function' ? target.resolveOrgRole(sessionKey) : null
    const result = await this.contactNotesRepository.updateContactNote(supabase, {
      contactId,
      noteId,
      orgId,
      userId,
      orgRole,
      updates,
    })
    if (result.error) throw new Error(`DB error: ${result.error.message}`)
    if (!result.data) return { success: false, error: 'Contact note not found.' }
    return { success: true, note: result.data }
  }
}
