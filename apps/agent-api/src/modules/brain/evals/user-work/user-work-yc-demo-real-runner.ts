import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { SupabaseClient } from '@supabase/supabase-js'
import { config as loadEnv } from 'dotenv'
import {
  brainEvalDataRepository,
  createEvalAnonClient,
  createEvalRlsClient,
  createEvalServiceClient,
} from '../repositories/brain-eval-data.repository'
import { UserWorkEvalRunner } from './user-work-eval-runner'
import type {
  UserWorkAgentRun,
  UserWorkEvalCase,
  UserWorkProbeRunner,
  UserWorkRetrievalProbeResult,
  UserWorkStreamEvent,
} from './user-work-eval.types'
import { OpenRouterUserWorkJudge } from './user-work-judge'
import {
  buildUnavailableProbeResult,
  evaluateProbe,
  fetchEvalProbe,
} from './user-work-retrieval-probe'
import { contentDeltaText } from './user-work-stream.util'
import { collectBrainActionCalls, extractToolCallSummary } from './user-work-tool-calls.util'
import { extractAgentUsageFromEvents, summarizeUserWorkSuiteUsage } from './user-work-usage.util'

loadEnv({ path: join(process.cwd(), '../api/.env') })
loadEnv({ path: join(process.cwd(), '.env') })

const fixturePath = join(__dirname, 'fixtures', 'yc-demo-user-work-set.json')
const defaultOutputDir = join(__dirname, 'logs')
const YC_DEMO_EMAIL = 'yc-demo@vibey.im'
const YC_DEMO_PASSWORD = 'VibeyYC2026Demo'

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value || undefined
}

async function createEvalConversation(input: {
  supabase: SupabaseClient
  userId: string
  orgId?: string
  agentKey: string
  evalCase: UserWorkEvalCase
}): Promise<string> {
  return brainEvalDataRepository.createUserWorkConversation(input.supabase, {
    userId: input.userId,
    orgId: input.orgId,
    agentKey: input.agentKey,
    evalCaseId: input.evalCase.id,
  })
}

class HttpUserWorkProbeRunner implements UserWorkProbeRunner {
  constructor(
    private readonly options: {
      apiBaseUrl: string
      accessToken: string
      refreshToken?: string
      orgId?: string
      agentKey: string
      probeLimit?: number
    },
  ) {}

  async probe(input: {
    evalCase: UserWorkEvalCase
    finalAnswer: string
  }): Promise<UserWorkRetrievalProbeResult> {
    const maxAttempts = 3
    let attempt = 0
    let lastError: unknown
    while (attempt < maxAttempts) {
      attempt += 1
      try {
        await waitForServerReady(this.options.apiBaseUrl)
        const response = await fetchEvalProbe(
          {
            apiBaseUrl: this.options.apiBaseUrl,
            accessToken: this.options.accessToken,
            refreshToken: this.options.refreshToken,
            orgId: this.options.orgId,
            agentKey: this.options.agentKey,
          },
          input.evalCase.userPrompt,
          input.evalCase.requiredContext,
          this.options.probeLimit,
        )
        return evaluateProbe({
          evalCase: input.evalCase,
          finalAnswer: input.finalAnswer,
          probe: response,
        })
      } catch (err) {
        lastError = err
        const message = err instanceof Error ? err.message : String(err)
        const retriable = isRetriableAgentError(message)
        if (!retriable || attempt >= maxAttempts) {
          console.warn(`[user-work] probe HTTP failed for ${input.evalCase.id}: ${message}`)
          return buildUnavailableProbeResult(message)
        }
        const backoffMs = Math.min(20_000, 1000 * 2 ** (attempt - 1))
        console.warn(
          `[user-work] probe transient failure for ${input.evalCase.id} (attempt ${attempt}/${maxAttempts}): ${message}; retrying in ${backoffMs}ms`,
        )
        await sleep(backoffMs)
      }
    }
    const message = lastError instanceof Error ? lastError.message : String(lastError)
    return buildUnavailableProbeResult(message || 'unknown')
  }
}

class VibeyChatUserWorkAgentRunner {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly options: {
      userId: string
      accessToken: string
      refreshToken?: string
      orgId?: string
      agentKey: string
      model?: string
      apiBaseUrl: string
    },
  ) {}

  async run(input: { evalCase: UserWorkEvalCase }): Promise<UserWorkAgentRun> {
    const maxAttempts = 3
    let attempt = 0
    let lastError: unknown
    while (attempt < maxAttempts) {
      attempt += 1
      try {
        await waitForServerReady(this.options.apiBaseUrl)
        return await this.runOnce(input)
      } catch (err) {
        lastError = err
        const message = err instanceof Error ? err.message : String(err)
        const retriable = isRetriableAgentError(message)
        if (!retriable || attempt >= maxAttempts) throw err
        const backoffMs = Math.min(30_000, 1500 * 2 ** (attempt - 1))
        console.warn(
          `[user-work] agent fetch transient failure for ${input.evalCase.id} (attempt ${attempt}/${maxAttempts}): ${message}; retrying in ${backoffMs}ms`,
        )
        await sleep(backoffMs)
      }
    }
    throw lastError ?? new Error('Agent run exhausted retries with no captured error')
  }

  private async runOnce(input: { evalCase: UserWorkEvalCase }): Promise<UserWorkAgentRun> {
    const conversationId = await createEvalConversation({
      supabase: this.supabase,
      userId: this.options.userId,
      orgId: this.options.orgId,
      agentKey: this.options.agentKey,
      evalCase: input.evalCase,
    })
    const events: UserWorkStreamEvent[] = []
    let finalAnswer = ''
    const startedAt = performance.now()
    const response = await fetch(`${this.options.apiBaseUrl.replace(/\/$/, '')}/api/chat`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.options.accessToken}`,
        'Content-Type': 'application/json',
        ...(this.options.refreshToken
          ? { 'x-supabase-refresh-token': this.options.refreshToken }
          : {}),
        ...(this.options.orgId ? { 'x-org-id': this.options.orgId } : {}),
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        content: input.evalCase.userPrompt,
        model: this.options.model,
        source: 'studio',
      }),
    })
    if (!response.ok || !response.body) {
      throw new Error(`Chat request failed: ${response.status} ${await response.text()}`)
    }
    const decoder = new TextDecoder()
    let buffer = ''
    try {
      for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
        buffer += decoder.decode(chunk, { stream: true })
        const frames = buffer.split('\n\n')
        buffer = frames.pop() ?? ''
        for (const frame of frames) {
          const line = frame
            .split('\n')
            .find((item) => item.startsWith('data: '))
            ?.slice('data: '.length)
          if (!line || line === '[DONE]') continue
          const parsed = JSON.parse(line) as Record<string, unknown>
          const type = String(parsed.type ?? '')
          if (!type) continue
          const { type: _type, ...data } = parsed
          events.push({ type, data })
          if (type === 'content_delta') finalAnswer += contentDeltaText(data)
        }
      }
    } catch (err) {
      if (!finalAnswer.trim()) throw err
      const message = err instanceof Error ? err.message : String(err)
      events.push({
        type: 'stream_warning',
        data: { message: `SSE stream closed after answer content: ${message}` },
      })
    }
    const latencyMs = performance.now() - startedAt
    return {
      caseId: input.evalCase.id,
      agentKey: this.options.agentKey,
      model: this.options.model,
      conversationId,
      finalAnswer,
      events,
      brainActionCalls: collectBrainActionCalls(events),
      latencyMs,
      usage: extractAgentUsageFromEvents(events, latencyMs),
      toolCalls: extractToolCallSummary(events),
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetriableAgentError(message: string): boolean {
  if (message.includes('429')) return true
  if (/fetch failed/i.test(message)) return true
  if (/socket/i.test(message)) return true
  if (/ECONN/i.test(message)) return true
  if (/Chat request failed: 5\d\d/.test(message)) return true
  if (/Chat request failed: 503/.test(message)) return true
  return false
}

let cachedServerReadyUntilMs = 0
async function waitForServerReady(apiBaseUrl: string, maxWaitMs = 300_000): Promise<void> {
  const now = Date.now()
  if (now < cachedServerReadyUntilMs) return
  const url = `${apiBaseUrl.replace(/\/$/, '')}/api/health`
  const startedAt = Date.now()
  let attempt = 0
  while (Date.now() - startedAt < maxWaitMs) {
    attempt += 1
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2000)
      const response = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)
      if (response.ok) {
        cachedServerReadyUntilMs = Date.now() + 3_000
        return
      }
    } catch {
      // server not up yet
    }
    if (attempt === 1) console.warn(`[user-work] waiting for ${url} to become ready...`)
    await sleep(1500)
  }
  throw new Error(`Server at ${url} did not become ready within ${maxWaitMs}ms`)
}

function createRlsClient(accessToken: string): SupabaseClient {
  return createEvalRlsClient(requireEnv, accessToken)
}

function loadCases(): UserWorkEvalCase[] {
  const allCases = JSON.parse(readFileSync(fixturePath, 'utf8')) as UserWorkEvalCase[]
  const validationOnly = optionalEnv('BRAIN_USER_WORK_VALIDATION_ONLY') === '1'
  let filtered = validationOnly
    ? allCases.filter((evalCase) => evalCase.validationSet === true)
    : allCases
  const caseId = optionalEnv('BRAIN_USER_WORK_CASE_ID')
  if (caseId) {
    filtered = filtered.filter((evalCase) => evalCase.id === caseId)
    if (filtered.length === 0) {
      throw new Error(`No user-work case found for BRAIN_USER_WORK_CASE_ID=${caseId}`)
    }
  }
  const offset = Number(process.env.BRAIN_USER_WORK_OFFSET ?? 0)
  const offsetApplied = Number.isFinite(offset) && offset > 0 ? filtered.slice(offset) : filtered
  const limit = Number(process.env.BRAIN_USER_WORK_LIMIT ?? offsetApplied.length)
  return Number.isFinite(limit) && limit > 0 ? offsetApplied.slice(0, limit) : offsetApplied
}

async function applyBrainConfig(
  apiBaseUrl: string,
  accessToken: string,
  orgId: string | undefined,
  env: Record<string, string | null>,
): Promise<void> {
  const url = `${apiBaseUrl.replace(/\/$/, '')}/api/internal/brain-eval/configure`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(orgId ? { 'x-org-id': orgId } : {}),
    },
    body: JSON.stringify({ env }),
  })
  if (!response.ok) {
    throw new Error(`Configure call failed: ${response.status} ${await response.text()}`)
  }
  const json = (await response.json()) as { applied: unknown; current: unknown }
  console.log('[user-work] brain config applied:', JSON.stringify(json))
}

function readEnvOverrides(): Record<string, string | null> {
  const overrides: Record<string, string | null> = {}
  for (const key of [
    'BRAIN_LLM_RERANKER',
    'BRAIN_MULTI_QUERY_RETRIEVAL',
    'BRAIN_EVIDENCE_CHUNKS',
  ]) {
    const value = process.env[`BRAIN_USER_WORK_OVERRIDE_${key}`]
    if (value !== undefined) overrides[key] = value.trim().length === 0 ? null : value.trim()
  }
  return overrides
}

async function resolveAuth(): Promise<{
  accessToken: string
  refreshToken?: string
  userId: string
}> {
  const explicitAccessToken = optionalEnv('BRAIN_USER_WORK_ACCESS_TOKEN')
  const explicitUserId = optionalEnv('BRAIN_USER_WORK_USER_ID')
  if (explicitAccessToken && explicitUserId) {
    return {
      accessToken: explicitAccessToken,
      refreshToken: optionalEnv('BRAIN_USER_WORK_REFRESH_TOKEN'),
      userId: explicitUserId,
    }
  }

  const supabase = createEvalAnonClient(requireEnv)
  const { data, error } = await brainEvalDataRepository.signInWithPassword(supabase, {
    email: optionalEnv('BRAIN_USER_WORK_EMAIL') ?? YC_DEMO_EMAIL,
    password: optionalEnv('BRAIN_USER_WORK_PASSWORD') ?? YC_DEMO_PASSWORD,
  })
  if (error) throw new Error(`Failed to sign in YC demo user: ${error.message}`)
  const accessToken = data.session?.access_token
  const userId = data.user?.id
  if (!accessToken || !userId) throw new Error('YC demo sign-in returned no session')
  return {
    accessToken,
    refreshToken: data.session?.refresh_token,
    userId,
  }
}

async function main() {
  const auth = await resolveAuth()
  const agentKey = optionalEnv('BRAIN_USER_WORK_AGENT_KEY') ?? 'vibey'
  const supabase = createEvalServiceClient(requireEnv)
  const apiBaseUrl = optionalEnv('BRAIN_USER_WORK_API_BASE_URL') ?? 'http://localhost:3003'
  const orgId = optionalEnv('BRAIN_USER_WORK_ORG_ID')
  const probeEnabled = optionalEnv('BRAIN_USER_WORK_PROBE') !== '0'

  const overrides = readEnvOverrides()
  if (Object.keys(overrides).length > 0) {
    await applyBrainConfig(apiBaseUrl, auth.accessToken, orgId, overrides)
  }
  const probeLimitRaw = Number(optionalEnv('BRAIN_USER_WORK_PROBE_LIMIT'))
  const probeLimit =
    Number.isFinite(probeLimitRaw) && probeLimitRaw > 0 ? Math.min(probeLimitRaw, 50) : undefined
  const probeRunner = probeEnabled
    ? new HttpUserWorkProbeRunner({
        apiBaseUrl,
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken,
        orgId,
        agentKey,
        probeLimit,
      })
    : undefined
  const runner = new UserWorkEvalRunner(
    new VibeyChatUserWorkAgentRunner(createRlsClient(auth.accessToken), {
      userId: auth.userId,
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken,
      orgId,
      agentKey,
      model: optionalEnv('BRAIN_USER_WORK_MODEL'),
      apiBaseUrl,
    }),
    new OpenRouterUserWorkJudge(
      optionalEnv('BRAIN_USER_WORK_JUDGE_MODEL') ?? 'google/gemini-3.5-flash',
      requireEnv('OPENROUTER_API_KEY'),
    ),
    async (caseUsages) => summarizeUserWorkSuiteUsage(supabase, caseUsages),
    probeRunner,
  )
  const suite = await runner.runSuite('yc-demo-user-work', loadCases())
  const outputDir = optionalEnv('BRAIN_USER_WORK_OUTPUT_DIR') ?? defaultOutputDir
  mkdirSync(outputDir, { recursive: true })
  const outputPath = join(
    outputDir,
    `user-work-run-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  )
  writeFileSync(outputPath, JSON.stringify(suite, null, 2))
  console.log(
    JSON.stringify(
      {
        suiteName: suite.suiteName,
        caseCount: suite.caseCount,
        passRate: suite.passRate,
        averageScore: suite.averageScore,
        validationPassRate: suite.validationPassRate,
        validationCaseCount: suite.validationCaseCount,
        validationAverageScore: suite.validationAverageScore,
        retrievalPassRate: suite.retrievalPassRate,
        synthesisPassRate: suite.synthesisPassRate,
        synthesisPassRateWhenRetrieved: suite.synthesisPassRateWhenRetrieved,
        avgRetrievalRecall: suite.avgRetrievalRecall,
        avgBrainCoverage: suite.avgBrainCoverage,
        failureBreakdown: suite.failureBreakdown,
        avgAgentLatencyMs: suite.avgAgentLatencyMs,
        avgJudgeLatencyMs: suite.avgJudgeLatencyMs,
        avgLatencyMs: suite.avgLatencyMs,
        avgToolCalls: suite.avgToolCalls,
        avgBrainToolCalls: suite.avgBrainToolCalls,
        totalToolCalls: suite.totalToolCalls,
        totalBrainToolCalls: suite.totalBrainToolCalls,
        totalUsage: suite.totalUsage,
        failures: suite.cases
          .filter((evalCase) => !evalCase.passed)
          .map((evalCase) => ({
            caseId: evalCase.caseId,
            weightedScore: evalCase.weightedScore,
            diagnostics: evalCase.diagnostics,
            retrievalFailureReasons: evalCase.judge.retrieval?.failureReasons ?? [],
            retrievalMissing: evalCase.judge.retrieval?.preloadMissing ?? [],
            retrievalMissingInBrain: evalCase.judge.retrieval?.preloadMissingInBrain ?? [],
            retrievalMissingNotInBrain: evalCase.judge.retrieval?.preloadMissingNotInBrain ?? [],
            retrievalLaneCounts: evalCase.judge.retrieval?.laneCounts,
            retrievalAvailable: evalCase.judge.retrieval?.probeAvailable ?? false,
            groundTruthAvailable: evalCase.judge.retrieval?.groundTruthAvailable ?? false,
            failedExpectations: evalCase.judge.expectations
              .filter((item) => !item.passed)
              .map((item) => ({ text: item.text, evidence: item.evidence })),
            adversarialFlips: evalCase.judge.adversarial?.flippedExpectations ?? [],
            failureReasons: evalCase.judge.failureReasons,
            agentLatencyMs: evalCase.agentRun.latencyMs,
            judgeLatencyMs: evalCase.judge.usage?.latencyMs,
            agentTokens: evalCase.agentRun.usage?.totalTokens,
            judgeTokens: evalCase.judge.usage?.totalTokens,
            toolCalls: evalCase.agentRun.toolCalls?.totalToolCalls,
            brainToolCalls: evalCase.agentRun.toolCalls?.brainToolCalls,
          })),
        outputPath,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
