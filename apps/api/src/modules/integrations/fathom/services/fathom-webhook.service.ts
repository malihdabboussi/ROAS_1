import { Injectable, Logger } from '@nestjs/common'
import { MeetingIntakeService } from '../../../meetings/intake/services/meeting-intake.service'
import { FathomRepository } from '../repositories/fathom.repository'
import { FathomApiService } from './fathom-api.service'

/**
 * Legacy Fathom door: `POST /integrations/fathom/webhook`.
 *
 * Connections created before ROA-40 still post here, because Fathom stores the
 * destination URL we registered at connect time. This service only works out
 * which user owns the delivery and hands the event to the shared meeting
 * intake. It is deleted once `reregisterAllWebhooks` has moved every
 * connection to `/integrations/meetings/webhooks/fathom/<key>`.
 */
@Injectable()
export class FathomWebhookService {
  private readonly logger = new Logger(FathomWebhookService.name)

  constructor(
    private readonly api: FathomApiService,
    private readonly repository: FathomRepository,
    private readonly intake: MeetingIntakeService,
  ) {}

  async processWebhookAsync(rawBody: string, signature: string): Promise<void> {
    let event: Record<string, unknown>
    try {
      event = JSON.parse(rawBody) as Record<string, unknown>
    } catch {
      this.logger.warn('Legacy Fathom webhook dropped: invalid JSON body')
      return
    }

    let userId: string | null = signature
      ? await this.api.resolveUserByWebhookSecret(signature)
      : null
    if (!userId) userId = await this.resolveUserFromPayload(event)
    if (!userId) {
      this.logger.warn('Legacy Fathom webhook dropped: could not resolve the owning user')
      return
    }

    const externalId = String(
      event.recording_id || event.id || event.call_id || event.meeting_id || `fathom-${Date.now()}`,
    )
    const result = await this.intake.intakeForUser({
      provider: 'fathom',
      userId,
      externalId,
      inlineEvent: event,
    })
    this.logger.log(
      `Legacy Fathom webhook for user ${userId} recording ${externalId}: ${result.status}${
        result.status === 'skipped' ? ` (${result.reason})` : ''
      }`,
    )
  }

  async resolveUserFromPayload(event: Record<string, unknown>): Promise<string | null> {
    const { data } = await this.repository.listConnectedIntegrationUserIds()
    if (!data || data.length === 0) return null

    const userIds = data.map((row) => row.user_id as string).filter(Boolean)
    const profiles = await this.repository.listProfilesForUserIds(userIds)
    const userIdByEmail = new Map<string, string>()
    for (const profile of profiles ?? []) {
      const row = profile as { id?: string; email?: string | null; fathom_aliases?: string[] }
      if (!row.id) continue
      const profileEmail = row.email?.trim().toLowerCase()
      if (profileEmail) userIdByEmail.set(profileEmail, row.id)
      const aliases = Array.isArray(row.fathom_aliases) ? row.fathom_aliases : []
      for (const alias of aliases) {
        const normalized = String(alias ?? '')
          .trim()
          .toLowerCase()
        if (normalized) userIdByEmail.set(normalized, row.id)
      }
    }

    const recordedByEmail = this.normalizeEmail(
      (event as { recorded_by?: { email?: unknown } }).recorded_by?.email,
    )
    if (recordedByEmail) {
      const ownerMatch = userIdByEmail.get(recordedByEmail)
      if (ownerMatch) return ownerMatch
    }

    // Shared-team webhooks often omit the signature. Attribute via invitees /
    // shared_with so teammate-hosted calls still land for connected attendees.
    for (const email of this.collectParticipantEmails(event)) {
      const matched = userIdByEmail.get(email)
      if (matched) return matched
    }

    // Last resort for unsigned shared_team deliveries: if exactly one connected
    // account subscribed to shared_team_recordings, that account owns the webhook.
    const sharedTeamOwners = await this.listSharedTeamRecordingOwnerUserIds()
    if (sharedTeamOwners.length === 1) return sharedTeamOwners[0]!

    return null
  }

  private normalizeEmail(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const normalized = value.trim().toLowerCase()
    return normalized.includes('@') ? normalized : null
  }

  private collectParticipantEmails(event: Record<string, unknown>): string[] {
    const emails = new Set<string>()
    const push = (value: unknown) => {
      if (typeof value === 'string') {
        const email = this.normalizeEmail(value)
        if (email) emails.add(email)
        return
      }
      if (!value || typeof value !== 'object' || Array.isArray(value)) return
      const row = value as Record<string, unknown>
      const email = this.normalizeEmail(row.email ?? row.mail ?? row.address)
      if (email) emails.add(email)
    }

    for (const key of ['calendar_invitees', 'shared_with', 'invitees', 'attendees'] as const) {
      const list = event[key]
      if (!Array.isArray(list)) continue
      for (const entry of list) push(entry)
    }
    return [...emails]
  }

  private async listSharedTeamRecordingOwnerUserIds(): Promise<string[]> {
    const rows = await this.repository.listConnectedWebhookRows()
    const owners: string[] = []
    for (const row of rows) {
      const userId = typeof row.user_id === 'string' ? row.user_id : ''
      if (!userId) continue
      const metadata =
        row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : {}
      const triggeredFor = Array.isArray(metadata.triggered_for)
        ? metadata.triggered_for.map((entry) => String(entry))
        : Array.isArray(metadata.webhook_triggered_for)
          ? metadata.webhook_triggered_for.map((entry) => String(entry))
          : []
      if (triggeredFor.includes('shared_team_recordings')) owners.push(userId)
    }
    return [...new Set(owners)]
  }
}
