import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { BillingCreditsRepository } from './billing-credits.repository'

export interface OrgCreditAlertCandidate {
  orgId: string
  periodStart: string
}

@Injectable()
export class BillingCreditAlertRepository {
  constructor(private readonly credits: BillingCreditsRepository) {}

  getClient(): SupabaseClient {
    return this.credits.getClient()
  }

  async listRecentlyUpdatedOrgLedgers(since: string): Promise<OrgCreditAlertCandidate[]> {
    const { data, error } = await this.getClient()
      .from('org_monthly_credit_usage')
      .select('org_id, month')
      .gt('total_credits_used', 0)
      .gte('updated_at', since)
      .order('updated_at', { ascending: false })
      .limit(1000)
    if (error) throw new Error(`Failed to load credit alert candidates: ${error.message}`)
    return (data ?? []).map((row) => ({
      orgId: String(row.org_id),
      periodStart: String(row.month),
    }))
  }

  async listOrgOwners(orgId: string): Promise<string[]> {
    const { data, error } = await this.getClient()
      .from('org_members')
      .select('user_id')
      .eq('org_id', orgId)
      .eq('role', 'owner')
      .eq('status', 'active')
    if (error) throw new Error(`Failed to load credit alert recipients: ${error.message}`)
    return (data ?? []).map((row) => String(row.user_id))
  }

  async findSlackUserId(orgId: string, userId: string): Promise<string | null> {
    const { data, error } = await this.getClient()
      .from('channel_members')
      .select('platform_id')
      .eq('org_id', orgId)
      .eq('platform', 'slack')
      .eq('vibey_user_id', userId)
      .eq('relationship_kind', 'internal')
      .limit(1)
      .maybeSingle<{ platform_id: string | null }>()
    if (error) throw new Error(`Failed to resolve credit alert Slack recipient: ${error.message}`)
    return data?.platform_id ? String(data.platform_id) : null
  }

  async claim(
    orgId: string,
    recipientUserId: string,
    periodStart: string,
    thresholdPercent: number,
  ): Promise<boolean> {
    const { error } = await this.getClient().from('billing_credit_slack_alerts').insert({
      org_id: orgId,
      recipient_user_id: recipientUserId,
      period_start: periodStart,
      threshold_percent: thresholdPercent,
    })
    if (!error) return true
    if (error.code === '23505') return false
    throw new Error(`Failed to claim credit alert: ${error.message}`)
  }

  async markSent(
    orgId: string,
    recipientUserId: string,
    periodStart: string,
    thresholdPercent: number,
    slackMessageTs: string | null,
  ): Promise<void> {
    const { error } = await this.getClient()
      .from('billing_credit_slack_alerts')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        slack_message_ts: slackMessageTs,
      })
      .eq('org_id', orgId)
      .eq('recipient_user_id', recipientUserId)
      .eq('period_start', periodStart)
      .eq('threshold_percent', thresholdPercent)
    if (error) throw new Error(`Failed to mark credit alert sent: ${error.message}`)
  }

  async markLowerThresholdsSatisfied(
    orgId: string,
    recipientUserId: string,
    periodStart: string,
    thresholds: number[],
  ): Promise<void> {
    if (thresholds.length === 0) return
    const sentAt = new Date().toISOString()
    const { error } = await this.getClient()
      .from('billing_credit_slack_alerts')
      .upsert(
        thresholds.map((thresholdPercent) => ({
          org_id: orgId,
          recipient_user_id: recipientUserId,
          period_start: periodStart,
          threshold_percent: thresholdPercent,
          status: 'sent',
          sent_at: sentAt,
        })),
        {
          onConflict: 'org_id,recipient_user_id,period_start,threshold_percent',
          ignoreDuplicates: true,
        },
      )
    if (error) throw new Error(`Failed to close lower credit alert thresholds: ${error.message}`)
  }

  async releaseClaim(
    orgId: string,
    recipientUserId: string,
    periodStart: string,
    thresholdPercent: number,
  ): Promise<void> {
    const { error } = await this.getClient()
      .from('billing_credit_slack_alerts')
      .delete()
      .eq('org_id', orgId)
      .eq('recipient_user_id', recipientUserId)
      .eq('period_start', periodStart)
      .eq('threshold_percent', thresholdPercent)
      .eq('status', 'pending')
    if (error) throw new Error(`Failed to release credit alert claim: ${error.message}`)
  }
}
