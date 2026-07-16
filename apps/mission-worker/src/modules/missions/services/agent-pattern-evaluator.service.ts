import { Injectable, Logger } from '@nestjs/common'
import { DatabaseService } from '../../../lib/services/database.service'
import { AgentSignalService } from './agent-signal.service'

@Injectable()
export class AgentPatternEvaluator {
  private readonly logger = new Logger(AgentPatternEvaluator.name)

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly agentSignalService: AgentSignalService,
  ) {}

  async getUsersWithCLevelAgents(): Promise<Array<{ user_id: string; org_id: string | null }>> {
    if (!this.databaseService.hasPgPool()) return []
    try {
      const { rows } = await this.databaseService.pgQuery<{
        user_id: string
        org_id: string | null
      }>(
        `
          SELECT DISTINCT ar.user_id, ar.org_id
          FROM agents_registry ar
          JOIN user_subscriptions us ON us.user_id = ar.user_id
            AND us.status IN ('active', 'trialing', 'past_due')
          JOIN subscription_plans sp ON sp.id = us.plan_id
            AND sp.slug != 'free'
          JOIN profiles p ON p.id = ar.user_id
            AND COALESCE(p.awareness_loop_enabled, false) = true
          WHERE ar.level = 'c_level'
            AND (ar.config->>'archetype') = 'ceo'
        `,
        [],
      )
      return (rows || [])
        .filter((row) => !!row.user_id)
        .map((row) => ({ user_id: String(row.user_id), org_id: row.org_id ?? null }))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (/awareness_loop_enabled/i.test(message)) {
        this.logger.warn(
          `Awareness loop query skipped — profiles.awareness_loop_enabled missing: ${message}`,
        )
        return []
      }
      throw error
    }
  }

  async hasAvailableCredits(userId: string, orgId?: string | null): Promise<boolean> {
    if (!this.databaseService.hasPgPool()) return false
    if (orgId) {
      const { rows } = await this.databaseService.pgQuery<{ remaining: string }>(
        `
          WITH latest_usage AS (
            SELECT base_allowance, base_credits_used, rollover_credits, purchased_credits_used
            FROM org_monthly_credit_usage
            WHERE org_id = $1::uuid
            ORDER BY month DESC LIMIT 1
          ),
          purchases AS (
            SELECT COALESCE(SUM(credits_purchased), 0) AS total_purchased
            FROM org_credit_purchases
            WHERE org_id = $1::uuid
              AND status = 'completed'
          )
          SELECT
            GREATEST(0, COALESCE(latest_usage.base_allowance,0) - COALESCE(latest_usage.base_credits_used,0))
            + COALESCE(latest_usage.rollover_credits,0)
            + GREATEST(0, COALESCE(purchases.total_purchased,0) - COALESCE(latest_usage.purchased_credits_used,0))
            AS remaining
          FROM purchases
          LEFT JOIN latest_usage ON TRUE
        `,
        [orgId],
      )
      if (!rows || rows.length === 0) return false
      return Number(rows[0].remaining) > 0
    }
    const { rows } = await this.databaseService.pgQuery<{ remaining: string }>(
      `
        WITH latest_usage AS (
          SELECT base_allowance, base_credits_used, rollover_credits, purchased_credits_used
          FROM monthly_credit_usage
          WHERE user_id = $1::uuid
          ORDER BY month DESC LIMIT 1
        ),
        purchases AS (
          SELECT COALESCE(SUM(credits_purchased), 0) AS total_purchased
          FROM credit_purchases
          WHERE user_id = $1::uuid
            AND status = 'completed'
        )
        SELECT
          GREATEST(0, COALESCE(latest_usage.base_allowance,0) - COALESCE(latest_usage.base_credits_used,0))
          + COALESCE(latest_usage.rollover_credits,0)
          + GREATEST(0, COALESCE(purchases.total_purchased,0) - COALESCE(latest_usage.purchased_credits_used,0))
          AS remaining
        FROM purchases
        LEFT JOIN latest_usage ON TRUE
      `,
      [userId],
    )
    if (!rows || rows.length === 0) return false
    return Number(rows[0].remaining) > 0
  }

  async disableAwarenessAndNotify(userId: string, orgId?: string | null): Promise<void> {
    const supabase = this.databaseService.getClient()
    await supabase.from('profiles').update({ awareness_loop_enabled: false }).eq('id', userId)
    const { error } = await supabase.from('user_notifications').insert({
      user_id: userId,
      org_id: orgId ?? null,
      type: 'awareness_paused',
      title: 'CEO Awareness paused',
      body: 'Your credits have run out. The awareness loop has been paused. Purchase more credits and re-enable it from Mission Control.',
      action_url: '/mission-control',
    })
    if (error) {
      this.logger.warn(`Failed to insert awareness_paused notification: ${error.message}`)
    }
    this.logger.warn(`Awareness loop auto-disabled for user ${userId} (credits exhausted)`)
  }

  async shouldFireForUser(
    userId: string,
    skipUserIds?: Set<string>,
    orgId?: string | null,
  ): Promise<boolean> {
    if (skipUserIds?.has(userId)) return false

    const hasCredits = await this.hasAvailableCredits(userId, orgId)
    if (!hasCredits) {
      await this.disableAwarenessAndNotify(userId, orgId)
      return false
    }

    const supabase = this.databaseService.getClient()

    let inProgressQ = supabase
      .from('agent_awareness_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'in_progress')
      .limit(1)
    if (orgId !== undefined)
      inProgressQ = orgId ? inProgressQ.eq('org_id', orgId) : inProgressQ.is('org_id', null)
    const { data: inProgress } = await inProgressQ
    if ((inProgress || []).length > 0) return false

    const { data: profile } = await supabase
      .from('profiles')
      .select('last_ceo_eval_at')
      .eq('id', userId)
      .maybeSingle()
    const lastEvalMs = profile?.last_ceo_eval_at ? new Date(profile.last_ceo_eval_at).getTime() : 0
    if (
      lastEvalMs &&
      !Number.isNaN(lastEvalMs) &&
      Date.now() - lastEvalMs < AgentSignalService.SIGNAL_COOLDOWN_MS
    ) {
      return false
    }

    await this.agentSignalService.checkSyntheticSignals(userId, orgId)
    const weight = await this.agentSignalService.getAccumulatedWeight(userId, orgId)
    return weight >= 4.0
  }
}
