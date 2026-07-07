import { Injectable, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SpaceAutomationService } from '../../spaces/services/space-automation.service'

@Injectable()
export class LeadContactAutomationService {
  constructor(
    @Optional()
    private readonly spaceAutomation?: SpaceAutomationService,
  ) {}

  async processContactCreated(
    supabase: SupabaseClient,
    input: {
      contactId: string
      userId: string
      orgId?: string | null
    },
  ): Promise<void> {
    await this.spaceAutomation?.processContactAutomationEvent(supabase, {
      type: 'contact_created',
      contact_id: input.contactId,
      user_id: input.userId,
      org_id: input.orgId ?? null,
    })
  }

  async emitContactAutomationDiffs(
    supabase: SupabaseClient,
    previous: Record<string, unknown>,
    updated: Record<string, unknown>,
    patch: Record<string, unknown>,
    actorUserId: string,
    orgId?: string | null,
  ): Promise<void> {
    if (!this.spaceAutomation) return
    const contactId = String(updated.id ?? previous.id)
    const contactUserId = String(updated.user_id ?? previous.user_id ?? actorUserId)
    const contactOrgId = (updated.org_id as string | null | undefined) ?? orgId ?? null
    for (const key of Object.keys(patch)) {
      const before = previous[key]
      const after = updated[key]
      if (JSON.stringify(before ?? null) === JSON.stringify(after ?? null)) continue
      await this.spaceAutomation.processContactAutomationEvent(supabase, {
        type: 'contact_updated',
        contact_id: contactId,
        user_id: contactUserId,
        org_id: contactOrgId,
        field_id: key,
        from: before,
        to: after,
      })
      await this.emitContactFieldEvents(supabase, key, {
        contactId,
        contactUserId,
        contactOrgId,
        before,
        after,
      })
    }
  }

  private async emitContactFieldEvents(
    supabase: SupabaseClient,
    key: string,
    input: {
      contactId: string
      contactUserId: string
      contactOrgId: string | null
      before: unknown
      after: unknown
    },
  ): Promise<void> {
    if (!this.spaceAutomation) return
    if (key === 'contact_type') {
      await this.spaceAutomation.processContactAutomationEvent(supabase, {
        type: 'contact_type_changed',
        contact_id: input.contactId,
        user_id: input.contactUserId,
        org_id: input.contactOrgId,
        from: input.before != null ? String(input.before) : undefined,
        to: input.after != null ? String(input.after) : undefined,
      })
    }
    if (key === 'contact_source') {
      await this.spaceAutomation.processContactAutomationEvent(supabase, {
        type: 'contact_source_changed',
        contact_id: input.contactId,
        user_id: input.contactUserId,
        org_id: input.contactOrgId,
        from: input.before != null ? String(input.before) : undefined,
        to: input.after != null ? String(input.after) : undefined,
      })
    }
    if (key === 'tags') {
      await this.emitTagDiffs(supabase, input)
    }
  }

  private async emitTagDiffs(
    supabase: SupabaseClient,
    input: {
      contactId: string
      contactUserId: string
      contactOrgId: string | null
      before: unknown
      after: unknown
    },
  ): Promise<void> {
    if (!this.spaceAutomation) return
    const beforeTags = Array.isArray(input.before) ? input.before.map(String) : []
    const afterTags = Array.isArray(input.after) ? input.after.map(String) : []
    for (const tag of afterTags.filter((tag) => !beforeTags.includes(tag))) {
      await this.spaceAutomation.processContactAutomationEvent(supabase, {
        type: 'contact_tag_added',
        contact_id: input.contactId,
        user_id: input.contactUserId,
        org_id: input.contactOrgId,
        tag,
      })
    }
    for (const tag of beforeTags.filter((tag) => !afterTags.includes(tag))) {
      await this.spaceAutomation.processContactAutomationEvent(supabase, {
        type: 'contact_tag_removed',
        contact_id: input.contactId,
        user_id: input.contactUserId,
        org_id: input.contactOrgId,
        tag,
      })
    }
  }
}
