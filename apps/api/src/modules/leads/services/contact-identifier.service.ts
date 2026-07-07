import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ContactIdentifierRepository } from '../repositories/contact-identifier.repository'

export const CONTACT_CHANNELS = [
  'funnel',
  'form',
  'widget',
  'telegram',
  'import',
  'manual',
  'automation',
  'integration',
] as const

export type ContactChannel = (typeof CONTACT_CHANNELS)[number]

export function isContactChannel(value: unknown): value is ContactChannel {
  return typeof value === 'string' && (CONTACT_CHANNELS as readonly string[]).includes(value)
}

/**
 * Folds legacy free-text contact_source values ('CSV Import', 'Manual Entry', ...) into the
 * channel enum + detail pair. Mirrors the mapping in
 * supabase/migrations/20260610150500_contacts_source_channel_normalization.sql.
 */
export function normalizeLegacyContactSource(value: string | null | undefined): {
  channel: ContactChannel | null
  detail: string | null
} {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return { channel: null, detail: null }
  const lowered = trimmed.toLowerCase()
  if (isContactChannel(lowered)) return { channel: lowered, detail: null }
  if (lowered === 'csv import') return { channel: 'import', detail: 'csv' }
  if (lowered === 'activecampaign') return { channel: 'import', detail: 'activecampaign' }
  if (lowered === 'gohighlevel') return { channel: 'import', detail: 'gohighlevel' }
  if (lowered === 'manual entry') return { channel: 'manual', detail: null }
  if (lowered === 'identifier') return { channel: 'integration', detail: 'identifier' }
  if (lowered === 'fathom') return { channel: 'integration', detail: 'fathom' }
  return { channel: null, detail: trimmed }
}

export type ContactIdentifierKind =
  | 'email'
  | 'phone'
  | 'slack_user_id'
  | 'telegram_chat_id'
  | 'ig_handle'
  | 'linkedin_url'
  | 'fathom_attendee_id'
  | 'gmail_thread_participant'
  | 'x_handle'
  | 'website_visitor_id'

export interface ContactOwner {
  userId: string
  orgId?: string | null
}

/** Tenant scope for identifier uniqueness: the org when one exists, else the personal account. */
export function contactOwnerKey(owner: ContactOwner): string {
  return owner.orgId ?? owner.userId
}

export interface ResolvedContact {
  id: string
  user_id: string
  org_id: string | null
  email: string | null
  contact_type: string
}

@Injectable()
export class ContactIdentifierService {
  constructor(
    private readonly contactIdentifierRepository: ContactIdentifierRepository = new ContactIdentifierRepository(),
  ) {}

  normalizeIdentifier(kind: ContactIdentifierKind, value: string): string {
    const trimmed = value.trim()
    if (kind === 'email') return trimmed.toLowerCase()
    if (kind === 'phone') return trimmed.replace(/[^\d+]/g, '')
    return trimmed
  }

  async resolveByKind(
    supabase: SupabaseClient,
    owner: ContactOwner,
    kind: ContactIdentifierKind,
    value: string,
  ): Promise<ResolvedContact | null> {
    const normalized = this.normalizeIdentifier(kind, value)
    if (!normalized) return null

    const contactId = await this.contactIdentifierRepository.findIdentifierContactId(supabase, {
      ownerKey: contactOwnerKey(owner),
      kind,
      value: normalized,
    })
    if (!contactId) return null

    return this.contactIdentifierRepository.findScopedContact(supabase, contactId, owner)
  }

  async findOrCreateContact(
    supabase: SupabaseClient,
    input: {
      userId: string
      orgId?: string | null
      kind: ContactIdentifierKind
      value: string
      email?: string | null
      firstName?: string | null
      lastName?: string | null
      channel: ContactChannel
      detail?: string | null
      confidence?: number
    },
  ): Promise<ResolvedContact> {
    const owner: ContactOwner = { userId: input.userId, orgId: input.orgId ?? null }
    const resolved = await this.resolveByKind(supabase, owner, input.kind, input.value)
    if (resolved) return resolved

    const normalized = this.normalizeIdentifier(input.kind, input.value)
    const email = input.email?.trim().toLowerCase() || (input.kind === 'email' ? normalized : null)

    let existingByEmail: ResolvedContact | null = null
    if (email) {
      // Contacts are owner-level: within an org, match by org regardless of which member created them.
      existingByEmail = await this.contactIdentifierRepository.findContactByEmail(
        supabase,
        owner,
        email,
      )
    }

    const contact =
      existingByEmail ??
      (await this.createUnknownContact(supabase, {
        userId: input.userId,
        orgId: input.orgId,
        email,
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        channel: input.channel,
        detail: input.detail ?? null,
      }))

    await this.attachIdentifier(supabase, {
      contactId: contact.id,
      owner,
      kind: input.kind,
      value: normalized,
      confidence: input.confidence ?? 1,
      source: input.channel,
    })

    if (email && input.kind !== 'email') {
      await this.attachIdentifier(supabase, {
        contactId: contact.id,
        owner,
        kind: 'email',
        value: email,
        confidence: input.confidence ?? 1,
        source: input.channel,
      })
    }

    return contact
  }

  async attachIdentifier(
    supabase: SupabaseClient,
    input: {
      contactId: string
      owner?: ContactOwner
      kind: ContactIdentifierKind
      value: string
      confidence?: number
      source?: string
    },
  ): Promise<void> {
    const normalized = this.normalizeIdentifier(input.kind, input.value)
    if (!normalized) return

    let ownerKey: string
    if (input.owner) {
      ownerKey = contactOwnerKey(input.owner)
    } else {
      // Derive the scope from the contact so owner_key can never disagree with the contact's owner.
      const row = await this.contactIdentifierRepository.findContactOwner(supabase, input.contactId)
      if (!row) return
      ownerKey = row.org_id ?? row.user_id
    }

    await this.contactIdentifierRepository.upsertIdentifier(supabase, {
      contactId: input.contactId,
      ownerKey,
      kind: input.kind,
      value: normalized,
      confidence: input.confidence ?? 1,
      source: input.source ?? 'system',
    })
  }

  private async createUnknownContact(
    supabase: SupabaseClient,
    input: {
      userId: string
      orgId?: string | null
      email: string | null
      firstName: string | null
      lastName: string | null
      channel: ContactChannel
      detail: string | null
    },
  ): Promise<ResolvedContact> {
    return this.contactIdentifierRepository.createUnknownContact(supabase, input)
  }
}
