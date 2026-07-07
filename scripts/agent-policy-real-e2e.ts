import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { Client } from 'pg'

type ScenarioResult = {
  name: string
  ok: boolean
  expected: string
  actual: string
}

function formatValue(value: unknown): string {
  if (value instanceof Error) return value.message
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

const ROOT = resolve(__dirname, '..')
const TEST_EMAIL = 'sefy@olympus-digital.com'
const TEAM_NAME = 'Policy Test Team'
const AGENT_KEY = 'policy_test_agent'
const CAMPAIGN_NAME = 'Policy Test Campaign'
const BASE_URL = process.env.AGENT_API_URL ?? 'http://localhost:3003'

function loadEnvFile(path: string) {
  if (!existsSync(path)) return
  const raw = readFileSync(path, 'utf8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    const value = trimmed
      .slice(idx + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnvFile(resolve(ROOT, 'apps/api/.env'))
loadEnvFile(resolve(ROOT, 'apps/agent-api/.env'))

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const databaseUrl = process.env.DATABASE_URL

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required',
  )
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function applySqlFile(fileName: string) {
  if (!databaseUrl) return
  const client = new Client({ connectionString: databaseUrl })
  await client.connect()
  try {
    const sql = readFileSync(resolve(ROOT, 'supabase/migrations', fileName), 'utf8')
    await client.query(sql)
  } finally {
    await client.end()
  }
}

async function ensureSchema() {
  await applySqlFile('20260514122000_capability_kind_action_domain.sql')
  await applySqlFile('20260514123500_agent_policy_invalidate_notify.sql')
}

async function findUserIdByEmail(email: string): Promise<string> {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const user = data.users.find((row) => row.email?.toLowerCase() === email.toLowerCase())
    if (user) return user.id
    if (data.users.length < 1000) break
  }
  throw new Error(`User not found: ${email}`)
}

async function maybeSingle<T>(query: any): Promise<T | null> {
  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return (data as T | null) ?? null
}

async function ensureTeam(userId: string): Promise<string> {
  const existing = await maybeSingle<{ id: string }>(
    supabase
      .from('agent_teams')
      .select('id')
      .eq('user_id', userId)
      .is('org_id', null)
      .eq('name', TEAM_NAME),
  )
  if (existing?.id) return existing.id
  const { data, error } = await supabase
    .from('agent_teams')
    .insert({
      user_id: userId,
      org_id: null,
      name: TEAM_NAME,
      color: 'blue',
      icon: 'shield-check',
      is_system: false,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

async function ensureCampaign(userId: string): Promise<string> {
  const existing = await maybeSingle<{ id: string }>(
    supabase
      .from('campaigns')
      .select('id')
      .eq('user_id', userId)
      .is('org_id', null)
      .eq('name', CAMPAIGN_NAME),
  )
  if (existing?.id) return existing.id
  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      user_id: userId,
      org_id: null,
      name: CAMPAIGN_NAME,
      campaign_type: 'get-more-leads',
      status: 'draft',
      config: { policy_test: true },
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

async function ensureAgent(userId: string, teamId: string) {
  const existing = await maybeSingle<{ id: string }>(
    supabase
      .from('agents_registry')
      .select('id')
      .eq('user_id', userId)
      .is('org_id', null)
      .eq('agent_key', AGENT_KEY),
  )
  const payload = {
    user_id: userId,
    org_id: null,
    agent_key: AGENT_KEY,
    name: 'Policy Test Agent',
    role: 'Marketing policy test agent',
    level: 'employee',
    status: 'idle',
    skills: [],
    team_id: teamId,
    config: {
      capability_profile: 'managed_domain',
      capability_domain: 'marketing',
      policy_test: true,
    },
  }
  if (existing?.id) {
    const { error } = await supabase.from('agents_registry').update(payload).eq('id', existing.id)
    if (error) throw error
    return
  }
  const { error } = await supabase.from('agents_registry').insert(payload)
  if (error) throw error
}

async function setTeamDomains(teamId: string, domains: string[]) {
  const { error: delError } = await supabase
    .from('agent_team_grants')
    .delete()
    .eq('team_id', teamId)
  if (delError) throw delError
  if (domains.length === 0) return
  const rows = domains.map((domain) => ({
    team_id: teamId,
    capability_kind: 'action_domain',
    capability_id: domain,
    mode: 'allow',
  }))
  const { error } = await supabase.from('agent_team_grants').insert(rows)
  if (error) throw error
}

async function setIntegrationGrant(teamId: string, integrationId: string) {
  const { error } = await supabase.from('agent_team_grants').insert({
    team_id: teamId,
    capability_kind: 'integration',
    capability_id: integrationId,
    mode: 'allow',
  })
  if (error && !String(error.message).includes('duplicate')) throw error
}

async function setAgentOverrides(userId: string, overrides: Array<{ id: string; mode: string }>) {
  const { error: delError } = await supabase
    .from('agent_overrides')
    .delete()
    .eq('agent_key', AGENT_KEY)
    .eq('user_id', userId)
    .is('org_id', null)
  if (delError) throw delError
  if (overrides.length === 0) return
  const rows = overrides.map((override) => ({
    agent_key: AGENT_KEY,
    user_id: userId,
    org_id: null,
    capability_kind: 'action_domain',
    capability_id: override.id,
    mode: override.mode,
  }))
  const { error } = await supabase.from('agent_overrides').insert(rows)
  if (error) throw error
}

async function notifyInvalidate(userId: string, teamId: string) {
  await supabase.rpc('notify_agent_policy_invalidate', {
    p_agent_key: AGENT_KEY,
    p_team_id: null,
    p_org_id: null,
    p_user_id: userId,
  })
  await supabase.rpc('notify_agent_policy_invalidate', {
    p_agent_key: null,
    p_team_id: teamId,
    p_org_id: null,
    p_user_id: userId,
  })
}

function sessionKey(userId: string, campaignId: string): string {
  const conversationId = randomUUID()
  return `agent:${AGENT_KEY}:${AGENT_KEY}-${userId}-${conversationId}::campaign:${campaignId}`
}

async function callAction(
  userId: string,
  campaignId: string,
  action: string,
  data: Record<string, unknown>,
) {
  const response = await fetch(`${BASE_URL}/api/artifacts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-openclaw-internal': 'true',
      'x-session-key': sessionKey(userId, campaignId),
    },
    body: JSON.stringify({ action, data }),
  })
  const text = await response.text()
  let body: any = text
  try {
    body = text ? JSON.parse(text) : null
  } catch {}
  return { status: response.status, ok: response.ok, body }
}

function isPolicyDenied(result: Awaited<ReturnType<typeof callAction>>): boolean {
  const text = JSON.stringify(result.body)
  return (
    result.status === 400 &&
    (text.includes('requires action domain') ||
      text.includes('denied by agent override') ||
      text.includes('requires the'))
  )
}

async function runScenario(
  name: string,
  expected: string,
  fn: () => Promise<{ ok: boolean; actual: string }>,
): Promise<ScenarioResult> {
  try {
    const result = await fn()
    return { name, expected, ok: result.ok, actual: result.actual }
  } catch (error) {
    return {
      name,
      expected,
      ok: false,
      actual: formatValue(error),
    }
  }
}

async function cleanupCreatedOffers(userId: string) {
  await supabase
    .from('offers')
    .delete()
    .eq('user_id', userId)
    .is('org_id', null)
    .like('name', 'Policy Test Offer%')
}

async function main() {
  await ensureSchema()

  const userId = await findUserIdByEmail(TEST_EMAIL)
  const teamId = await ensureTeam(userId)
  const campaignId = await ensureCampaign(userId)
  await ensureAgent(userId, teamId)
  await cleanupCreatedOffers(userId)

  const results: ScenarioResult[] = []

  results.push(
    await runScenario('team denies write_marketing_artifacts', 'create_offer blocked', async () => {
      await setTeamDomains(teamId, ['read_campaign', 'read_marketing_artifacts'])
      await setAgentOverrides(userId, [])
      await notifyInvalidate(userId, teamId)
      const result = await callAction(userId, campaignId, 'create_offer', {
        campaign_id: campaignId,
        name: `Policy Test Offer Denied ${Date.now()}`,
      })
      return { ok: isPolicyDenied(result), actual: JSON.stringify(result.body).slice(0, 300) }
    }),
  )

  results.push(
    await runScenario(
      'team allows write_marketing_artifacts',
      'create_offer succeeds',
      async () => {
        await setTeamDomains(teamId, [
          'read_campaign',
          'read_marketing_artifacts',
          'write_marketing_artifacts',
        ])
        await setAgentOverrides(userId, [])
        await notifyInvalidate(userId, teamId)
        const result = await callAction(userId, campaignId, 'create_offer', {
          campaign_id: campaignId,
          name: `Policy Test Offer Team Allow ${Date.now()}`,
        })
        return {
          ok: result.ok && Boolean(result.body?.id),
          actual: JSON.stringify(result.body).slice(0, 300),
        }
      },
    ),
  )

  results.push(
    await runScenario(
      'agent deny overrides team allow',
      'create_offer blocked by agent deny',
      async () => {
        await setTeamDomains(teamId, [
          'read_campaign',
          'read_marketing_artifacts',
          'write_marketing_artifacts',
        ])
        await setAgentOverrides(userId, [{ id: 'write_marketing_artifacts', mode: 'deny' }])
        await notifyInvalidate(userId, teamId)
        const result = await callAction(userId, campaignId, 'create_offer', {
          campaign_id: campaignId,
          name: `Policy Test Offer Agent Deny ${Date.now()}`,
        })
        return { ok: isPolicyDenied(result), actual: JSON.stringify(result.body).slice(0, 300) }
      },
    ),
  )

  results.push(
    await runScenario(
      'agent allow_extra overrides team deny',
      'create_offer succeeds',
      async () => {
        await setTeamDomains(teamId, ['read_campaign', 'read_marketing_artifacts'])
        await setAgentOverrides(userId, [{ id: 'write_marketing_artifacts', mode: 'allow_extra' }])
        await notifyInvalidate(userId, teamId)
        const result = await callAction(userId, campaignId, 'create_offer', {
          campaign_id: campaignId,
          name: `Policy Test Offer Agent Allow ${Date.now()}`,
        })
        return {
          ok: result.ok && Boolean(result.body?.id),
          actual: JSON.stringify(result.body).slice(0, 300),
        }
      },
    ),
  )

  results.push(
    await runScenario(
      'override removed returns to team baseline',
      'create_offer blocked again',
      async () => {
        await setTeamDomains(teamId, ['read_campaign', 'read_marketing_artifacts'])
        await setAgentOverrides(userId, [])
        await notifyInvalidate(userId, teamId)
        const result = await callAction(userId, campaignId, 'create_offer', {
          campaign_id: campaignId,
          name: `Policy Test Offer Inherit ${Date.now()}`,
        })
        return { ok: isPolicyDenied(result), actual: JSON.stringify(result.body).slice(0, 300) }
      },
    ),
  )

  results.push(
    await runScenario(
      'read_campaign denied',
      'get_campaign blocked before data access',
      async () => {
        await setTeamDomains(teamId, ['read_marketing_artifacts'])
        await setAgentOverrides(userId, [])
        await notifyInvalidate(userId, teamId)
        const result = await callAction(userId, campaignId, 'get_campaign', {
          campaign_id: campaignId,
        })
        return { ok: isPolicyDenied(result), actual: JSON.stringify(result.body).slice(0, 300) }
      },
    ),
  )

  results.push(
    await runScenario(
      'integration double gate missing toolkit grant',
      'use_integration blocked',
      async () => {
        await setTeamDomains(teamId, ['use_integrations'])
        await setAgentOverrides(userId, [])
        await notifyInvalidate(userId, teamId)
        const result = await callAction(userId, campaignId, 'use_integration', {
          service: 'slack',
          integration_action: 'SLACK_LIST_CHANNELS',
        })
        const text = JSON.stringify(result.body)
        return {
          ok: result.status >= 400 && !text.includes('requires action domain'),
          actual: text.slice(0, 300),
        }
      },
    ),
  )

  results.push(
    await runScenario(
      'integration double gate domain denied',
      'use_integration blocked by domain',
      async () => {
        await setTeamDomains(teamId, [])
        await setIntegrationGrant(teamId, 'slack')
        await setAgentOverrides(userId, [])
        await notifyInvalidate(userId, teamId)
        const result = await callAction(userId, campaignId, 'use_integration', {
          service: 'slack',
          integration_action: 'SLACK_LIST_CHANNELS',
        })
        return { ok: isPolicyDenied(result), actual: JSON.stringify(result.body).slice(0, 300) }
      },
    ),
  )

  await cleanupCreatedOffers(userId)
  await setAgentOverrides(userId, [])

  const failed = results.filter((result) => !result.ok)
  for (const result of results) {
    const status = result.ok ? 'PASS' : 'FAIL'
    console.log(
      `${status} | ${result.name} | expected=${result.expected} | actual=${result.actual}`,
    )
  }
  if (failed.length > 0) {
    throw new Error(`${failed.length} policy scenarios failed`)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
