import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { normalizeIncomingNoteCardTint } from '../constants/note-card-tint'
import { UUID_RE } from './leads-controller-utils'
import { LeadsService } from '../services/leads.service'

@Controller('leads')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
export class LeadContactActionsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post('contacts/:id/send-email')
  @HttpCode(HttpStatus.CREATED)
  async sendContactEmail(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
    @Body() body: { subject?: string; body?: string; from_identity_id?: string | null },
  ) {
    if (!UUID_RE.test(id)) throw new BadRequestException('Invalid contact id')
    const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
    const emailBody = typeof body.body === 'string' ? body.body.trim() : ''
    if (!subject) throw new BadRequestException('subject is required')
    if (!emailBody) throw new BadRequestException('body is required')
    const fromIdentityId =
      typeof body.from_identity_id === 'string' && body.from_identity_id.trim()
        ? body.from_identity_id.trim()
        : null
    if (fromIdentityId && !UUID_RE.test(fromIdentityId)) {
      throw new BadRequestException('from_identity_id must be a valid UUID')
    }
    return this.leadsService.sendEmailToContact(
      supabase,
      id,
      { subject, body: emailBody, from_identity_id: fromIdentityId },
      scope.orgId,
    )
  }

  @Patch('contacts/:id/conversations/:conversationId/link')
  async linkConversationToContact(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
    @Param('conversationId') conversationId: string,
  ) {
    if (!UUID_RE.test(id)) throw new BadRequestException('Invalid contact id')
    if (!UUID_RE.test(conversationId)) throw new BadRequestException('Invalid conversation id')
    return this.leadsService.linkConversationToContact(supabase, id, conversationId, scope.orgId)
  }

  @Post('contacts/:id/notes')
  @HttpCode(HttpStatus.CREATED)
  async addContactNote(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
    @Body() body: { content?: string; card_tint?: string | null; cardTint?: string | null },
  ) {
    if (!UUID_RE.test(id)) throw new BadRequestException('Invalid contact id')
    const content = typeof body.content === 'string' ? body.content.trim() : ''
    if (!content) throw new BadRequestException('Note content is required')
    const cardTint = normalizeIncomingNoteCardTint(body.card_tint ?? body.cardTint)
    return this.leadsService.addContactNote(supabase, id, user.id, content, scope.orgId, cardTint)
  }

  @Patch('contacts/:id/notes/:noteId')
  async updateContactNote(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
    @Param('noteId') noteId: string,
    @Body() body: { content?: string; card_tint?: string | null; cardTint?: string | null },
  ) {
    if (!UUID_RE.test(id)) throw new BadRequestException('Invalid contact id')
    if (!UUID_RE.test(noteId)) throw new BadRequestException('Invalid note id')
    const updates: { content?: string; card_tint?: string | null } = {}
    if (typeof body.content === 'string') {
      const trimmed = body.content.trim()
      if (!trimmed) throw new BadRequestException('Note content cannot be empty')
      updates.content = trimmed
    }
    if ('card_tint' in body || 'cardTint' in body) {
      updates.card_tint = normalizeIncomingNoteCardTint(body.card_tint ?? body.cardTint)
    }
    return this.leadsService.updateContactNote(
      supabase,
      noteId,
      user.id,
      scope.orgId,
      scope.orgRole as string | null,
      updates,
    )
  }
}
