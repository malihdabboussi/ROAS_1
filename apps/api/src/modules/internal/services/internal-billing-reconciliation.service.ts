import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { CreditsService, type CreditBalance } from '../../billing/services/credits.service'
import type { OrgOpenRouterReconciliationDto } from '../dto/internal-billing-reconciliation.dto'
import { InternalRepository } from '../repositories/internal.repository'

type SourceUsageRow = {
  id: string
  created_at: string
  feature: string | null
  action: string | null
  model_name: string | null
  computed_cost: number | string | null
  credits_charged: number | null
}

type SourceBucket = {
  sourceDay: string
  feature: string
  originalAction: string
  modelName: string
  sourceEventCount: number
  sourceLoggedGatewayCostUsd: number
  sourceCreditsCharged: number
  firstSourceEventAt: string
  lastSourceEventAt: string
  estimatedActualOpenrouterCostUsd: number
  totalAdditionalCredits: number
}

type AllocatedBucket = SourceBucket & {
  batchCreditsAllocated: number
  batchEstimatedProviderCostUsd: number
}

type VisibleAllocatedRow = AllocatedBucket & {
  sourceBucketBatchCredits: number
  sourceBucketEstimatedProviderCostUsd: number
  visibleRowIndex: number
  visibleRowCount: number
  createdAt: string
}

@Injectable()
export class InternalBillingReconciliationService {
  private readonly logger = new Logger(InternalBillingReconciliationService.name)

  constructor(
    private readonly repository: InternalRepository,
    private readonly creditsService: CreditsService,
  ) {}

  async reconcileOrgOpenRouter(body: OrgOpenRouterReconciliationDto) {
    const supabase = this.repository.createServiceClient()
    const beforeBalance = await this.creditsService.getOrgBalance(body.orgId)

    const { data: org, error: orgError } = await this.repository.getOrganizationForReconciliation(
      supabase,
      body.orgId,
    )
    if (orgError) throw new BadRequestException(`Failed to load org: ${orgError.message}`)
    if (!org) throw new NotFoundException('Organization not found')

    const existing = await this.repository.listReconciliationRowsByBatchId(
      supabase,
      body.orgId,
      body.batchId,
    )
    if (existing.error) {
      throw new BadRequestException(`Failed to check reconciliation batch: ${existing.error.message}`)
    }
    if ((existing.data?.length ?? 0) > 0) {
      throw new BadRequestException(`Reconciliation batch already exists: ${body.batchId}`)
    }

    const sourceRows = await this.listAllSourceRows(body.orgId, body.windowStart, body.windowEnd)
    const discountPercent = Number(org.credit_discount_percent ?? 0)
    const buckets = this.buildSourceBuckets(sourceRows, body.allocationFactor, discountPercent)
    const totalAdditionalCredits = buckets.reduce((sum, bucket) => sum + bucket.totalAdditionalCredits, 0)
    if (totalAdditionalCredits <= 0) {
      throw new BadRequestException('No additional credits calculated for this reconciliation window')
    }
    if (body.batchCredits > totalAdditionalCredits) {
      throw new BadRequestException(
        `batchCredits exceeds calculated remaining total (${totalAdditionalCredits})`,
      )
    }

    const allocatedBuckets = this.allocateBatchCredits(buckets, body.batchCredits)
    const visibleRows = this.splitAllocatedBuckets(
      allocatedBuckets,
      body.maxVisibleRowCredits,
    )
    const autoRecharge = await this.loadAutoRechargePreview(body.orgId, beforeBalance, body.batchCredits)
    const preview = this.buildPreview(
      body,
      org,
      beforeBalance,
      buckets,
      visibleRows,
      autoRecharge,
    )

    if (body.dryRun) return preview

    if (body.batchCredits > beforeBalance.totalAvailable) {
      throw new BadRequestException('batchCredits exceeds current org balance')
    }

    const payloads = visibleRows.map((row) =>
      this.buildUsageEventPayload(body, org, row, discountPercent),
    )
    const inserted = await this.repository.insertUsageEvents(supabase, payloads)
    if (inserted.error) {
      throw new BadRequestException(`Failed to insert reconciliation usage rows: ${inserted.error.message}`)
    }

    try {
      const afterBalance = await this.creditsService.deductOrgCredits(body.orgId, body.batchCredits)
      const afterAutoRecharge = await this.loadAutoRechargePreview(body.orgId, afterBalance, 0)
      return {
        ...preview,
        dryRun: false,
        applied: true,
        rowsInserted: inserted.data?.length ?? 0,
        insertedCredits: (inserted.data ?? []).reduce(
          (sum, row: { credits_charged?: number | null }) => sum + Number(row.credits_charged ?? 0),
          0,
        ),
        afterBalance,
        afterAutoRecharge,
      }
    } catch (err) {
      const insertedIds = (inserted.data ?? [])
        .map((row: { id?: string | null }) => row.id)
        .filter((id): id is string => Boolean(id))
      if (insertedIds.length > 0) {
        const rollback = await this.repository.deleteUsageEventsByIds(supabase, insertedIds)
        if (rollback.error) {
          this.logger.error(`Failed to roll back reconciliation rows: ${rollback.error.message}`)
        }
      }
      throw err
    }
  }

  private async listAllSourceRows(orgId: string, windowStart: string, windowEnd: string) {
    const supabase = this.repository.createServiceClient()
    const pageSize = 1000
    const rows: SourceUsageRow[] = []

    for (let from = 0; ; from += pageSize) {
      const { data, error } = await this.repository.listOpenClawGatewayUsageRows(
        supabase,
        orgId,
        windowStart,
        windowEnd,
        from,
        from + pageSize - 1,
      )
      if (error) throw new BadRequestException(`Failed to load source usage rows: ${error.message}`)
      rows.push(...((data ?? []) as SourceUsageRow[]))
      if ((data?.length ?? 0) < pageSize) break
    }

    if (rows.length === 0) {
      throw new BadRequestException('No source gateway_tokens rows found for this window')
    }

    return rows
  }

  private buildSourceBuckets(
    rows: SourceUsageRow[],
    allocationFactor: number,
    discountPercent: number,
  ): SourceBucket[] {
    const byKey = new Map<string, SourceBucket>()
    const discountMultiplier = Math.max(0, 1 - discountPercent / 100)

    for (const row of rows) {
      const createdAt = row.created_at
      const sourceDay = createdAt.slice(0, 10)
      const feature = row.feature ?? 'unknown'
      const originalAction = row.action ?? 'unknown'
      const modelName = row.model_name ?? 'unknown'
      const key = `${sourceDay}\u0000${feature}\u0000${originalAction}\u0000${modelName}`
      const existing = byKey.get(key)
      const loggedCost = Number(row.computed_cost ?? 0)
      const credits = Number(row.credits_charged ?? 0)

      if (!existing) {
        byKey.set(key, {
          sourceDay,
          feature,
          originalAction,
          modelName,
          sourceEventCount: 1,
          sourceLoggedGatewayCostUsd: loggedCost,
          sourceCreditsCharged: credits,
          firstSourceEventAt: createdAt,
          lastSourceEventAt: createdAt,
          estimatedActualOpenrouterCostUsd: 0,
          totalAdditionalCredits: 0,
        })
        continue
      }

      existing.sourceEventCount += 1
      existing.sourceLoggedGatewayCostUsd += loggedCost
      existing.sourceCreditsCharged += credits
      if (createdAt < existing.firstSourceEventAt) existing.firstSourceEventAt = createdAt
      if (createdAt > existing.lastSourceEventAt) existing.lastSourceEventAt = createdAt
    }

    return [...byKey.values()]
      .map((bucket) => {
        const estimatedActual = bucket.sourceLoggedGatewayCostUsd * allocationFactor
        const targetCredits = Math.ceil(estimatedActual * 2 * discountMultiplier * 200)
        return {
          ...bucket,
          estimatedActualOpenrouterCostUsd: estimatedActual,
          totalAdditionalCredits: Math.max(0, targetCredits - bucket.sourceCreditsCharged),
        }
      })
      .filter((bucket) => bucket.totalAdditionalCredits > 0)
      .sort((a, b) =>
        [
          a.sourceDay.localeCompare(b.sourceDay),
          a.feature.localeCompare(b.feature),
          a.originalAction.localeCompare(b.originalAction),
          a.modelName.localeCompare(b.modelName),
        ].find((value) => value !== 0) ?? 0,
      )
  }

  private allocateBatchCredits(buckets: SourceBucket[], batchCredits: number): AllocatedBucket[] {
    const totalAdditionalCredits = buckets.reduce(
      (sum, bucket) => sum + bucket.totalAdditionalCredits,
      0,
    )
    const baseRows = buckets.map((bucket) => {
      const raw = (batchCredits * bucket.totalAdditionalCredits) / totalAdditionalCredits
      return {
        bucket,
        baseCredits: Math.floor(raw),
        fractional: raw - Math.floor(raw),
      }
    })
    const baseTotal = baseRows.reduce((sum, row) => sum + row.baseCredits, 0)
    const remaining = batchCredits - baseTotal
    const ranked = [...baseRows].sort((a, b) => {
      const fractional = b.fractional - a.fractional
      if (fractional !== 0) return fractional
      return b.bucket.totalAdditionalCredits - a.bucket.totalAdditionalCredits
    })
    const extraKeys = new Set(ranked.slice(0, remaining).map((row) => row.bucket))

    return baseRows
      .map(({ bucket, baseCredits }) => {
        const batchCreditsAllocated = baseCredits + (extraKeys.has(bucket) ? 1 : 0)
        const batchEstimatedProviderCostUsd =
          bucket.estimatedActualOpenrouterCostUsd *
          (batchCreditsAllocated / bucket.totalAdditionalCredits)
        return { ...bucket, batchCreditsAllocated, batchEstimatedProviderCostUsd }
      })
      .filter((bucket) => bucket.batchCreditsAllocated > 0)
  }

  private splitAllocatedBuckets(
    buckets: AllocatedBucket[],
    maxVisibleRowCredits: number,
  ): VisibleAllocatedRow[] {
    return buckets.flatMap((bucket) => {
      const visibleRowCount = Math.ceil(bucket.batchCreditsAllocated / maxVisibleRowCredits)
      const baseCredits = Math.floor(bucket.batchCreditsAllocated / visibleRowCount)
      const extraCredits = bucket.batchCreditsAllocated - baseCredits * visibleRowCount
      let remainingProviderCost = bucket.batchEstimatedProviderCostUsd

      return Array.from({ length: visibleRowCount }, (_, index) => {
        const batchCreditsAllocated = baseCredits + (index < extraCredits ? 1 : 0)
        const batchEstimatedProviderCostUsd =
          index === visibleRowCount - 1
            ? remainingProviderCost
            : bucket.batchEstimatedProviderCostUsd *
              (batchCreditsAllocated / bucket.batchCreditsAllocated)
        remainingProviderCost -= batchEstimatedProviderCostUsd

        return {
          ...bucket,
          sourceBucketBatchCredits: bucket.batchCreditsAllocated,
          sourceBucketEstimatedProviderCostUsd: bucket.batchEstimatedProviderCostUsd,
          batchCreditsAllocated,
          batchEstimatedProviderCostUsd,
          visibleRowIndex: index + 1,
          visibleRowCount,
          createdAt: this.interpolateSourceTimestamp(
            bucket.firstSourceEventAt,
            bucket.lastSourceEventAt,
            index,
            visibleRowCount,
          ),
        }
      })
    })
  }

  private interpolateSourceTimestamp(
    firstSourceEventAt: string,
    lastSourceEventAt: string,
    index: number,
    visibleRowCount: number,
  ) {
    if (visibleRowCount <= 1) return lastSourceEventAt

    const startMs = new Date(firstSourceEventAt).getTime()
    const endMs = new Date(lastSourceEventAt).getTime()
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
      return lastSourceEventAt
    }

    const offsetMs = ((endMs - startMs) * (index + 1)) / (visibleRowCount + 1)
    return new Date(startMs + offsetMs).toISOString()
  }

  private async loadAutoRechargePreview(
    orgId: string,
    balance: CreditBalance,
    creditsToDeduct: number,
  ) {
    const supabase = this.repository.createServiceClient()
    const now = new Date()
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
    const [configResult, countResult, paymentResult] = await Promise.all([
      this.repository.getOrgAutoRechargeSettings(supabase, orgId),
      this.repository.countOrgAutoRechargesThisMonth(
        supabase,
        orgId,
        monthStart.toISOString(),
        nextMonthStart.toISOString(),
      ),
      this.repository.getOrgSubscriptionPaymentState(supabase, orgId),
    ])

    const config = configResult.data
    const projectedAvailable = Math.max(0, balance.totalAvailable - creditsToDeduct)
    const rechargesThisMonth = countResult.count ?? 0
    const shouldAttempt =
      Boolean(config?.is_enabled) &&
      projectedAvailable <= Number(config?.threshold_credits ?? -1) &&
      Number(config?.recharge_amount ?? 0) >= 2000 &&
      Number(config?.recharge_amount ?? 0) % 200 === 0 &&
      Number(config?.max_monthly_recharges ?? 0) > rechargesThisMonth &&
      Boolean(paymentResult.data?.stripe_customer_id)

    return {
      projectedAvailableCredits: projectedAvailable,
      config: config ?? null,
      rechargesThisMonth,
      hasStripeCustomer: Boolean(paymentResult.data?.stripe_customer_id),
      hasStripeSubscription: Boolean(paymentResult.data?.stripe_subscription_id),
      shouldAttemptAutoRecharge: shouldAttempt,
    }
  }

  private buildPreview(
    body: OrgOpenRouterReconciliationDto,
    org: Record<string, unknown>,
    beforeBalance: CreditBalance,
    buckets: SourceBucket[],
    visibleRows: VisibleAllocatedRow[],
    autoRecharge: Awaited<ReturnType<InternalBillingReconciliationService['loadAutoRechargePreview']>>,
  ) {
    return {
      dryRun: true,
      applied: false,
      org: {
        id: org.id,
        name: org.name,
        ownerId: org.owner_id,
        creditDiscountPercent: Number(org.credit_discount_percent ?? 0),
      },
      batch: {
        id: body.batchId,
        windowStart: body.windowStart,
        windowEnd: body.windowEnd,
        allocationFactor: body.allocationFactor,
        requestedCredits: body.batchCredits,
        maxVisibleRowCredits: body.maxVisibleRowCredits,
      },
      audit: body.audit ?? null,
      beforeBalance,
      autoRecharge,
      totals: {
        sourceBuckets: buckets.length,
        sourceEvents: buckets.reduce((sum, bucket) => sum + bucket.sourceEventCount, 0),
        totalAdditionalCredits: buckets.reduce(
          (sum, bucket) => sum + bucket.totalAdditionalCredits,
          0,
        ),
        visibleRows: visibleRows.length,
        batchCredits: visibleRows.reduce(
          (sum, row) => sum + row.batchCreditsAllocated,
          0,
        ),
        batchEstimatedProviderCostUsd: Number(
          visibleRows
            .reduce((sum, row) => sum + row.batchEstimatedProviderCostUsd, 0)
            .toFixed(6),
        ),
      },
      rows: visibleRows.map((row) => ({
        createdAt: row.createdAt,
        feature: row.feature,
        action: `${row.originalAction}_openrouter_reconciliation`,
        modelName: row.modelName,
        sourceDay: row.sourceDay,
        sourceEventCount: row.sourceEventCount,
        sourceLoggedGatewayCostUsd: Number(row.sourceLoggedGatewayCostUsd.toFixed(6)),
        sourceCreditsCharged: row.sourceCreditsCharged,
        totalAdditionalCredits: row.totalAdditionalCredits,
        sourceBucketBatchCredits: row.sourceBucketBatchCredits,
        visibleRowIndex: row.visibleRowIndex,
        visibleRowCount: row.visibleRowCount,
        batchCredits: row.batchCreditsAllocated,
        batchEstimatedProviderCostUsd: Number(row.batchEstimatedProviderCostUsd.toFixed(6)),
      })),
    }
  }

  private buildUsageEventPayload(
    body: OrgOpenRouterReconciliationDto,
    org: Record<string, unknown>,
    row: VisibleAllocatedRow,
    discountPercent: number,
  ) {
    return {
      user_id: org.owner_id,
      org_id: org.id,
      feature: row.feature,
      action: `${row.originalAction}_openrouter_reconciliation`,
      provider: 'openrouter',
      model_name: row.modelName,
      service_type: 'text',
      input_tokens: 0,
      output_tokens: 0,
      cache_read_tokens: 0,
      cache_write_tokens: 0,
      total_tokens: 0,
      computed_cost: Number(row.batchEstimatedProviderCostUsd.toFixed(6)),
      credits_charged: row.batchCreditsAllocated,
      cost_source: 'openrouter_reconciliation_estimate',
      idempotency_key: `openrouter-reconciliation:${body.batchId}:${row.sourceDay}:${row.feature}:${row.originalAction}:${this.hashLike(row.modelName)}:${row.visibleRowIndex}-of-${row.visibleRowCount}`,
      created_at: row.createdAt,
      metadata_json: {
        type: 'openrouter_reconciliation',
        batch_id: body.batchId,
        reason: 'historical_openclaw_gateway_tokens_missing_provider_cost',
        presentation: 'spread_to_original_usage_day_chunked',
        org_name: org.name,
        approved_by_user: true,
        reconciliation_window_start_utc: body.windowStart,
        reconciliation_window_end_utc: body.windowEnd,
        allocation_factor: body.allocationFactor,
        credit_discount_percent: discountPercent,
        max_visible_row_credits: body.maxVisibleRowCredits,
        source_day_utc: row.sourceDay,
        source_feature: row.feature,
        source_action: row.originalAction,
        source_model_name: row.modelName,
        source_event_count: row.sourceEventCount,
        source_logged_gateway_cost_usd: Number(row.sourceLoggedGatewayCostUsd.toFixed(6)),
        source_credits_charged: row.sourceCreditsCharged,
        source_first_event_at: row.firstSourceEventAt,
        source_last_event_at: row.lastSourceEventAt,
        total_additional_credits_for_bucket: row.totalAdditionalCredits,
        source_bucket_batch_credits: row.sourceBucketBatchCredits,
        source_bucket_estimated_provider_cost_usd: Number(
          row.sourceBucketEstimatedProviderCostUsd.toFixed(6),
        ),
        visible_row_index: row.visibleRowIndex,
        visible_row_count: row.visibleRowCount,
        batch_credits_allocated: row.batchCreditsAllocated,
        batch_estimated_provider_cost_usd: Number(row.batchEstimatedProviderCostUsd.toFixed(6)),
        audit: body.audit ?? null,
      },
    }
  }

  private hashLike(value: string) {
    let hash = 0
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 31 + value.charCodeAt(i)) >>> 0
    }
    return hash.toString(16)
  }
}
