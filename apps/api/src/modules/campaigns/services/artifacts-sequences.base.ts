import { NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ArtifactsOffersBase } from './artifacts-offers.base'

export class ArtifactsSequencesBase extends ArtifactsOffersBase {
  // ─── Sequences ───

  async listSequences(
    supabase: SupabaseClient,
    campaignId: string,
    spaceId?: string,
    options?: { summary?: boolean },
  ) {
    return this.artifactSequencesRepo.listSequences(supabase, campaignId, spaceId, options)
  }

  async getSequence(supabase: SupabaseClient, id: string) {
    const data = await this.artifactSequencesRepo.getSequence(supabase, id)
    if (!data) throw new NotFoundException('Sequence not found')

    // Sort emails by order_index
    if (data.sequence_emails) {
      data.sequence_emails.sort(
        (a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index,
      )
    }

    return data
  }

  async reorderSequenceEmails(supabase: SupabaseClient, sequenceId: string, emailIds: string[]) {
    for (let i = 0; i < emailIds.length; i++) {
      const email = await this.artifactSequencesRepo.findSequenceEmail(supabase, emailIds[i])

      if (!email || email.sequence_id !== sequenceId) {
        throw new NotFoundException(`Email not found: ${emailIds[i]}`)
      }

      await this.artifactSequencesRepo.updateSequenceEmailOrder(supabase, emailIds[i], i)
    }
    return this.getSequence(supabase, sequenceId)
  }

  async moveSequenceEmailToSequence(
    supabase: SupabaseClient,
    targetSequenceId: string,
    emailId: string,
  ) {
    const email = await this.artifactSequencesRepo.findSequenceEmail(supabase, emailId)

    if (!email) throw new NotFoundException('Email not found')

    const sourceSequenceId = email.sequence_id
    if (sourceSequenceId === targetSequenceId) {
      return this.getSequence(supabase, targetSequenceId)
    }

    const targetEmails = await this.artifactSequencesRepo.listSequenceEmailIds(
      supabase,
      targetSequenceId,
    )

    const newOrderIndex = targetEmails?.length ?? 0

    await this.artifactSequencesRepo.moveSequenceEmail(
      supabase,
      emailId,
      targetSequenceId,
      newOrderIndex,
    )
    return this.getSequence(supabase, targetSequenceId)
  }

  async createSequenceEmail(supabase: SupabaseClient, sequenceId: string) {
    await this.getSequence(supabase, sequenceId)

    const existingEmails = await this.artifactSequencesRepo.listSequenceEmailOrderIndexes(
      supabase,
      sequenceId,
    )

    const nextOrderIndex =
      (existingEmails ?? []).reduce(
        (max, row) =>
          typeof row.order_index === 'number' && row.order_index > max ? row.order_index : max,
        -1,
      ) + 1

    const email = await this.artifactSequencesRepo.createSequenceEmail(supabase, {
      sequence_id: sequenceId,
      subject: 'Untitled Email',
      body: '',
      delay_hours: 0,
      order_index: nextOrderIndex,
      status: 'draft',
    })

    return email
  }

  async updateSequenceEmail(
    supabase: SupabaseClient,
    sequenceId: string,
    emailId: string,
    data: {
      subject?: string
      body?: string
      delay_hours?: number
      status?: 'draft' | 'ready' | 'sent'
    },
  ) {
    const email = await this.artifactSequencesRepo.findSequenceEmail(supabase, emailId)

    if (!email || email.sequence_id !== sequenceId) {
      throw new NotFoundException(`Email not found: ${emailId}`)
    }

    return this.artifactSequencesRepo.updateSequenceEmail(supabase, emailId, data)
  }

  async updateSequence(supabase: SupabaseClient, id: string, name?: string) {
    const seq = await this.getSequence(supabase, id)
    return this.artifactSequencesRepo.updateSequence(supabase, id, {
      name: name ?? seq.name,
      updated_at: new Date().toISOString(),
    })
  }

  async deleteSequence(
    supabase: SupabaseClient,
    id: string,
    deleteMode: 'keep_unsent' | 'remove_unsent',
  ) {
    const sequence = await this.getSequence(supabase, id)

    if (deleteMode === 'remove_unsent') {
      const emailIds = (sequence.sequence_emails ?? [])
        .map((email: { id?: string }) => email.id)
        .filter(
          (emailId: string | undefined): emailId is string =>
            typeof emailId === 'string' && emailId.length > 0,
        )

      if (emailIds.length > 0) {
        const now = new Date().toISOString()
        await this.artifactSequencesRepo.cancelUnsentEmailSchedules(supabase, emailIds, now)
      }

      await this.artifactSequencesRepo.markPendingSequenceSendsSkipped(
        supabase,
        id,
        new Date().toISOString(),
      )
    }

    await this.artifactSequencesRepo.deleteSequence(supabase, id)
  }

  async syncSequenceUnsentEmails(supabase: SupabaseClient, id: string) {
    const sequence = await this.getSequence(supabase, id)
    const emails = (sequence.sequence_emails ?? []) as Array<{
      id: string
      subject: string | null
      body: string | null
    }>

    let updated = 0
    for (const email of emails) {
      if (!email?.id) continue

      const nextSubject = typeof email.subject === 'string' ? email.subject.trim() : ''
      const nextBody = typeof email.body === 'string' ? email.body : ''
      if (!nextSubject || !nextBody) continue

      updated += await this.artifactSequencesRepo.syncScheduledEmailContent(
        supabase,
        email.id,
        nextSubject,
        nextBody,
      )
    }

    return { success: true as const, updated }
  }
}
