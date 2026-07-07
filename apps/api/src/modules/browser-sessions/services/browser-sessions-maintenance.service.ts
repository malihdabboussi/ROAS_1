import { Injectable, Logger } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { BrowserSessionsRepository } from '../repositories/browser-sessions.repository'

@Injectable()
export class BrowserSessionsMaintenanceService {
  private readonly logger = new Logger(BrowserSessionsMaintenanceService.name)

  constructor(
    private readonly svc: SupabaseServiceClient,
    private readonly browserSessionsRepository: BrowserSessionsRepository,
  ) {}

  async checkAndNotifyExpiringSessions(): Promise<{ notified: number }> {
    const supabase = this.svc.client
    const nowIso = new Date().toISOString()
    const thresholdIso = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    const dedupeIso = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

    const { data: expiringRows, error } = await this.browserSessionsRepository.listExpiringSessions(
      supabase,
      {
        nowIso,
        thresholdIso,
      },
    )

    if (error || !expiringRows) {
      if (error) this.logger.warn(`expiring lookup failed: ${error.message}`)
      return { notified: 0 }
    }

    let notified = 0
    for (const row of expiringRows as Array<{
      user_id: string
      org_id: string | null
      domain: string
      min_expires_at: string | null
    }>) {
      const { data: existingNotif } =
        await this.browserSessionsRepository.findRecentExpiringNotification(supabase, {
          userId: row.user_id,
          domain: row.domain,
          dedupeIso,
        })

      if (existingNotif) continue

      const daysLeft = row.min_expires_at
        ? Math.max(0, Math.ceil((new Date(row.min_expires_at).getTime() - Date.now()) / 86_400_000))
        : 0
      const domainLabel = row.domain.replace(/\.com$/, '')
      const { error: insertError } =
        await this.browserSessionsRepository.insertExpiringNotification(supabase, {
          user_id: row.user_id,
          org_id: row.org_id,
          type: 'browser_session_expiring',
          title: `${domainLabel} session expiring soon`,
          body: `Your saved ${domainLabel} session expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Visit ${row.domain} with the Vibey Mini extension installed to refresh it.`,
          action_url: `https://${row.domain}`,
          channel_sent: { domain: row.domain },
        })
      if (!insertError) notified++
    }

    if (notified > 0) {
      this.logger.log(`Emitted ${notified} browser_session_expiring notifications`)
    }
    return { notified }
  }
}
