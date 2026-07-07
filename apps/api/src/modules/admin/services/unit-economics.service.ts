import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PostgresDirectService } from '@vibey/api-shared'
import { FREE_BASE_CREDITS } from '../../billing/constants/credit-allowances'

const WINDOW_DAYS = 30

const CREDIT_PRICE_USD = 0.005
const TOKEN_COST_USD = 0.0025
const FIXED_PLATFORM_USD_MONTHLY = 227
const CREDITS_PER_USD = 200

/** Vercel Sandbox published list prices (USD); override via env if the page changes. */
const VERCEL_SANDBOX_CPU_USD_PER_CORE_SEC = 0.00003942
const VERCEL_SANDBOX_MEMORY_USD_PER_GIB_SEC = 0.00000672
const SANDBOX_MIN_BILLABLE_CPU_CORES = 0.125

export type UnitEconomicsSandboxPricing = {
  mode: 'computed' | 'hourly_override'
  cpuUsdPerCoreSecond: number
  memoryUsdPerGibSecond: number
  allocatedCpuCores: number
  allocatedMemoryGib: number
  effectiveCpuCores: number
  usdPerSecond: number
}

export type UnitEconomicsPersonaRow = {
  key: string
  label: string
  monthlyMachineHours: number
  creditsModeled: number
  grossRevenueUsd: number
  tokenCostUsd: number
  infraCostUsd: number
  contributionMarginUsd: number
  contributionMarginPct: number | null
}

export type UnitEconomicsResponse = {
  generatedAt: string
  windowDays: number
  constants: {
    creditPriceUsd: number
    tokenCostUsd: number
    fixedPlatformUsdMonthly: number
    flyMachineHourlyUsd: number
    sandboxMachineHourlyUsd: number
    combinedInfraHourlyUsd: number
    idleThresholdMinutes: number
    creditsPerUsd: number
    sandboxPricing: UnitEconomicsSandboxPricing
  }
  aggregates: {
    totalCreditsCharged: number
    paidPlanCreditsCharged: number
    freePlanCreditsCharged: number
    machineRunningSeconds: number
    infraUsdFromSnapshots: number
    snapshotRowCount: number
    grossRevenueUsd: number
    tokenCogsUsd: number
    creditSpreadUsd: number
    paidProfileCount: number
  }
  bridge: {
    creditsPerMachineSecond: number | null
    creditsPerMachineHour: number | null
  }
  health: {
    breakevenCreditsPerMachineHour: number
    isBurnBelowBreakeven: boolean | null
    infraAsPercentOfCreditSpread: number | null
    blendedPaidUserGrossMarginPct: number | null
    paidUsersToCoverFixedCostsMonthly: number | null
    drainNarrative: string
  }
  idle: {
    structuralDeficitUsd: number
    infraToSpreadRatio: number | null
    note: string
  }
  microScenarioIdlePrompt: {
    credits: number
    machineMinutes: number
    grossRevenueUsd: number
    tokenCostUsd: number
    infraCostUsd: number
    contributionMarginUsd: number
  }
  personas: UnitEconomicsPersonaRow[]
}

type SqlAggRow = {
  total: string | number | null
  paid: string | number | null
  free: string | number | null
  running_seconds: string | number | null
  infra_usd: string | number | null
  snapshot_rows: string | number | null
  paid_profiles: string | number | null
}

@Injectable()
export class UnitEconomicsService {
  constructor(
    private readonly postgres: PostgresDirectService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Default: Vercel Sandbox CPU/memory per-second list pricing × allocation (min 0.125 vCPU billed).
   * Set SANDBOX_MACHINE_HOURLY_RATE to bypass and use one explicit hourly number.
   */
  private resolveSandboxHourlyUsd(): {
    hourlyUsd: number
    pricing: UnitEconomicsSandboxPricing
  } {
    const rawOverride = this.config.get<string | undefined>('SANDBOX_MACHINE_HOURLY_RATE')
    if (rawOverride !== undefined && String(rawOverride).trim() !== '') {
      const v = parseFloat(rawOverride)
      if (!Number.isNaN(v)) {
        return {
          hourlyUsd: v,
          pricing: {
            mode: 'hourly_override',
            cpuUsdPerCoreSecond: 0,
            memoryUsdPerGibSecond: 0,
            allocatedCpuCores: 0,
            allocatedMemoryGib: 0,
            effectiveCpuCores: 0,
            usdPerSecond: v / 3600,
          },
        }
      }
    }

    const cpuRate = parseFloat(
      this.config.get<string>('SANDBOX_CPU_USD_PER_CORE_SEC') ??
        String(VERCEL_SANDBOX_CPU_USD_PER_CORE_SEC),
    )
    const memRate = parseFloat(
      this.config.get<string>('SANDBOX_MEMORY_USD_PER_GIB_SEC') ??
        String(VERCEL_SANDBOX_MEMORY_USD_PER_GIB_SEC),
    )
    const allocatedCpu = parseFloat(this.config.get<string>('SANDBOX_CPU_CORES') ?? '1')
    const allocatedMem = parseFloat(this.config.get<string>('SANDBOX_MEMORY_GIB') ?? '4')
    const effectiveCpu = Math.max(allocatedCpu, SANDBOX_MIN_BILLABLE_CPU_CORES)
    const perSec = effectiveCpu * cpuRate + allocatedMem * memRate
    const hourly = perSec * 3600

    return {
      hourlyUsd: hourly,
      pricing: {
        mode: 'computed',
        cpuUsdPerCoreSecond: cpuRate,
        memoryUsdPerGibSecond: memRate,
        allocatedCpuCores: allocatedCpu,
        allocatedMemoryGib: allocatedMem,
        effectiveCpuCores: effectiveCpu,
        usdPerSecond: perSec,
      },
    }
  }

  async getUnitEconomics(): Promise<UnitEconomicsResponse> {
    if (!this.postgres.hasConnectionString()) {
      throw new ServiceUnavailableException(
        'Unit economics requires DATABASE_URL / SUPABASE_DIRECT_DB_URL for SQL aggregates',
      )
    }

    const flyHourly = parseFloat(this.config.get<string>('FLY_MACHINE_HOURLY_RATE') ?? '0.0226')
    const { hourlyUsd: sandboxHourly, pricing: sandboxPricing } = this.resolveSandboxHourlyUsd()
    const combinedHourly = flyHourly + sandboxHourly
    const idleMs = parseInt(
      this.config.get<string>('MACHINE_IDLE_THRESHOLD_MS') ?? String(15 * 60 * 1000),
      10,
    )

    const { rows } = await this.postgres.query<SqlAggRow>(
      `WITH
credits AS (
  SELECT
    coalesce(sum(e.credits_charged), 0)::bigint AS total,
    coalesce(sum(e.credits_charged) FILTER (WHERE p.plan IS DISTINCT FROM 'free'), 0)::bigint AS paid,
    coalesce(sum(e.credits_charged) FILTER (WHERE p.plan = 'free'), 0)::bigint AS free
  FROM ai_usage_events e
  INNER JOIN profiles p ON p.id = e.user_id
  WHERE e.created_at >= now() - make_interval(days => $1)
),
machine AS (
  SELECT
    coalesce(
      sum(
        s.running * greatest(
          0,
          extract(epoch from (coalesce(s.next_at, now()) - s.snapshot_at))
        )
      ),
      0
    )::bigint AS running_seconds,
    coalesce(
      sum(
        s.estimated_hourly_cost::numeric
        * (
          extract(epoch from (coalesce(s.next_at, now()) - s.snapshot_at)) / 3600.0
        )
      ),
      0
    )::numeric AS infra_usd,
    count(*)::int AS snapshot_rows
  FROM (
    SELECT
      snapshot_at,
      running,
      estimated_hourly_cost,
      lead(snapshot_at) OVER (ORDER BY snapshot_at) AS next_at
    FROM machine_status_snapshots
    WHERE snapshot_at >= now() - make_interval(days => $1)
  ) s
),
paid_count AS (
  SELECT count(*)::int AS n FROM profiles WHERE plan IS DISTINCT FROM 'free'
)
SELECT c.total, c.paid, c.free, m.running_seconds, m.infra_usd, m.snapshot_rows, p.n AS paid_profiles
FROM credits c
CROSS JOIN machine m
CROSS JOIN paid_count p`,
      [WINDOW_DAYS],
    )

    const r = rows[0]
    if (!r) {
      throw new ServiceUnavailableException('Unit economics aggregate returned no row')
    }

    const totalCredits = Number(r.total ?? 0)
    const paidCredits = Number(r.paid ?? 0)
    const freeCredits = Number(r.free ?? 0)
    const machineRunningSeconds = Number(r.running_seconds ?? 0)
    const infraUsd = Number(r.infra_usd ?? 0)
    const snapshotRows = Number(r.snapshot_rows ?? 0)
    const paidProfiles = Number(r.paid_profiles ?? 0)

    const grossAll = totalCredits * CREDIT_PRICE_USD
    const tokenAll = totalCredits * TOKEN_COST_USD
    const spreadAll = grossAll - tokenAll

    const creditsPerMachineSecond =
      machineRunningSeconds > 0 ? totalCredits / machineRunningSeconds : null
    const creditsPerMachineHour =
      creditsPerMachineSecond !== null ? creditsPerMachineSecond * 3600 : null

    const breakevenCreditsPerMachineHour =
      combinedHourly > 0 && TOKEN_COST_USD > 0 ? combinedHourly / TOKEN_COST_USD : 0

    const isBurnBelowBreakeven =
      creditsPerMachineHour !== null && breakevenCreditsPerMachineHour > 0
        ? creditsPerMachineHour < breakevenCreditsPerMachineHour
        : null

    const infraAsPercentOfCreditSpread =
      spreadAll > 0 ? Math.round((infraUsd / spreadAll) * 10000) / 100 : null

    const paidGross = paidCredits * CREDIT_PRICE_USD
    const paidToken = paidCredits * TOKEN_COST_USD
    const paidInfraShare = totalCredits > 0 ? (paidCredits / totalCredits) * infraUsd : 0
    const paidCm = paidGross - paidToken - paidInfraShare
    const blendedPaidUserGrossMarginPct =
      paidGross > 0 ? Math.round((paidCm / paidGross) * 10000) / 100 : null

    const structuralDeficitUsd = Math.max(0, infraUsd - spreadAll)

    const infraToSpreadRatio =
      spreadAll > 0 ? Math.round((infraUsd / spreadAll) * 1000) / 1000 : null

    const cpch = creditsPerMachineHour ?? 0

    const personaDefs: Array<{ key: string; label: string; monthlyMachineHours: number }> = [
      { key: 'light', label: 'Light user', monthlyMachineHours: 5 },
      { key: 'average', label: 'Average user', monthlyMachineHours: 30 },
      { key: 'power', label: 'Power user', monthlyMachineHours: 150 },
      { key: 'always_on', label: '24/7 bot', monthlyMachineHours: 720 },
    ]

    const modelCredits = (hours: number) => (cpch > 0 ? Math.round(cpch * hours) : 0)

    const personaRows: UnitEconomicsPersonaRow[] = personaDefs.map((d) => {
      const c = modelCredits(d.monthlyMachineHours)
      const gross = c * CREDIT_PRICE_USD
      const tok = c * TOKEN_COST_USD
      const infra = d.monthlyMachineHours * combinedHourly
      const cm = gross - tok - infra
      const pct = gross > 0 ? Math.round((cm / gross) * 10000) / 100 : null
      return {
        key: d.key,
        label: d.label,
        monthlyMachineHours: d.monthlyMachineHours,
        creditsModeled: c,
        grossRevenueUsd: Math.round(gross * 10000) / 10000,
        tokenCostUsd: Math.round(tok * 10000) / 10000,
        infraCostUsd: Math.round(infra * 10000) / 10000,
        contributionMarginUsd: Math.round(cm * 10000) / 10000,
        contributionMarginPct: pct,
      }
    })

    const freeCreditsGrant = FREE_BASE_CREDITS
    const freeToken = freeCreditsGrant * TOKEN_COST_USD
    const freeHoursModeled = cpch > 0 ? freeCreditsGrant / cpch : 0
    const freeInfra = freeHoursModeled * combinedHourly
    const freeCm = 0 - freeToken - freeInfra
    personaRows.unshift({
      key: 'free_tier',
      label: 'Free tier ($10 value / 2k credits)',
      monthlyMachineHours: Math.round(freeHoursModeled * 100) / 100,
      creditsModeled: freeCreditsGrant,
      grossRevenueUsd: 0,
      tokenCostUsd: Math.round(freeToken * 10000) / 10000,
      infraCostUsd: Math.round(freeInfra * 10000) / 10000,
      contributionMarginUsd: Math.round(freeCm * 10000) / 10000,
      contributionMarginPct: null,
    })

    const averageRow = personaRows.find((p) => p.key === 'average')
    const avgCm = averageRow?.contributionMarginUsd ?? 0
    const paidUsersToCoverFixedCostsMonthly =
      avgCm > 0 ? Math.ceil(FIXED_PLATFORM_USD_MONTHLY / avgCm) : null

    const drainNarrative =
      creditsPerMachineHour === null || machineRunningSeconds === 0
        ? 'Not enough machine snapshot data in the window to compute a burn bridge.'
        : breakevenCreditsPerMachineHour <= 0
          ? 'Set FLY_MACHINE_HOURLY_RATE and sandbox pricing (defaults use Vercel list CPU/memory rates) or SANDBOX_MACHINE_HOURLY_RATE override to compute infra breakeven.'
          : isBurnBelowBreakeven === true
            ? `Observed blended burn (${Math.round(creditsPerMachineHour)} credits/machine-hour) is below infra breakeven (~${Math.round(breakevenCreditsPerMachineHour)} credits/machine-hour at current hourly rates). Margin after token COGS does not cover one always-on machine at typical Fly+sandbox rates.`
            : `Observed blended burn (${Math.round(creditsPerMachineHour)} credits/machine-hour) is at or above infra breakeven (~${Math.round(breakevenCreditsPerMachineHour)} credits/machine-hour).`

    const microH = 15 / 60
    const microCredits = 5
    const microGross = microCredits * CREDIT_PRICE_USD
    const microTok = microCredits * TOKEN_COST_USD
    const microInfra = microH * combinedHourly
    const microCm = microGross - microTok - microInfra

    return {
      generatedAt: new Date().toISOString(),
      windowDays: WINDOW_DAYS,
      constants: {
        creditPriceUsd: CREDIT_PRICE_USD,
        tokenCostUsd: TOKEN_COST_USD,
        fixedPlatformUsdMonthly: FIXED_PLATFORM_USD_MONTHLY,
        flyMachineHourlyUsd: flyHourly,
        sandboxMachineHourlyUsd: Math.round(sandboxHourly * 10000) / 10000,
        combinedInfraHourlyUsd: Math.round(combinedHourly * 10000) / 10000,
        idleThresholdMinutes: Math.round(idleMs / 60000),
        creditsPerUsd: CREDITS_PER_USD,
        sandboxPricing: {
          ...sandboxPricing,
          cpuUsdPerCoreSecond: Math.round(sandboxPricing.cpuUsdPerCoreSecond * 1e8) / 1e8,
          memoryUsdPerGibSecond: Math.round(sandboxPricing.memoryUsdPerGibSecond * 1e8) / 1e8,
          usdPerSecond: Math.round(sandboxPricing.usdPerSecond * 1e8) / 1e8,
        },
      },
      aggregates: {
        totalCreditsCharged: totalCredits,
        paidPlanCreditsCharged: paidCredits,
        freePlanCreditsCharged: freeCredits,
        machineRunningSeconds,
        infraUsdFromSnapshots: Math.round(infraUsd * 10000) / 10000,
        snapshotRowCount: snapshotRows,
        grossRevenueUsd: Math.round(grossAll * 10000) / 10000,
        tokenCogsUsd: Math.round(tokenAll * 10000) / 10000,
        creditSpreadUsd: Math.round(spreadAll * 10000) / 10000,
        paidProfileCount: paidProfiles,
      },
      bridge: {
        creditsPerMachineSecond:
          creditsPerMachineSecond !== null ? Math.round(creditsPerMachineSecond * 1e9) / 1e9 : null,
        creditsPerMachineHour:
          creditsPerMachineHour !== null ? Math.round(creditsPerMachineHour * 100) / 100 : null,
      },
      health: {
        breakevenCreditsPerMachineHour: Math.round(breakevenCreditsPerMachineHour * 10000) / 10000,
        isBurnBelowBreakeven,
        infraAsPercentOfCreditSpread,
        blendedPaidUserGrossMarginPct,
        paidUsersToCoverFixedCostsMonthly,
        drainNarrative,
      },
      idle: {
        structuralDeficitUsd: Math.round(structuralDeficitUsd * 10000) / 10000,
        infraToSpreadRatio,
        note: 'Structural deficit = max(0, infra from snapshots − total credit spread). When > 0, Fly+sandbox time in the window consumed more than the entire 2× token markup pool. Idle extensions (e.g. 15m before suspend) increase machine-seconds without credits; compare the micro-scenario (5 credits, 15m on).',
      },
      microScenarioIdlePrompt: {
        credits: microCredits,
        machineMinutes: 15,
        grossRevenueUsd: Math.round(microGross * 10000) / 10000,
        tokenCostUsd: Math.round(microTok * 10000) / 10000,
        infraCostUsd: Math.round(microInfra * 10000) / 10000,
        contributionMarginUsd: Math.round(microCm * 10000) / 10000,
      },
      personas: personaRows,
    }
  }
}
