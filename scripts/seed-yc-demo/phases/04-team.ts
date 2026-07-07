/**
 * P4 — Team (7 named agent hires + 4 agent_teams + grants).
 *
 * For each AgentHire in content/team.ts:
 *   1. POST /internal/agents/hire-ready (apps/api InternalAgentsController →
 *      AgentOnboardingService.hireReadyEmployee) with the closest matching
 *      `role_key` from agent_employee_templates + the hire's custom `name`.
 *   2. Backdate agents_registry.created_at + agent_definitions.created_at to
 *      AgentHire.hiredAt via direct service-role UPDATE.
 *   3. For deepBrain hires (Maya/Leo/Sara/Devon/Casey), INSERT a per-agent
 *      ns_brains row (scope='agent', agent_id=<agent_key>, org_id=orgId,
 *      owner_id=founderUserId) with deterministic id and backdated created_at.
 *
 * Then INSERT 4 agent_teams (brand/growth/delivery/ops) directly via service
 * role (the public /agent-teams endpoint requires a real user session — the
 * internal token doesn't qualify), assign each hired agent to the right team
 * (UPDATE agents_registry.team_id), and INSERT agent_team_grants per the
 * locked matrix (integrations + brain_domains + client channels).
 *
 * Gateway-sync risk: hireReadyEmployee triggers MissionAgentGatewayService.
 * triggerAgentSkillsSync → agent-api. If that fails the service throws
 * "Agent \"<key>\" created but sync failed" and rolls the agent back. We
 * detect that error class, log a warning, and continue the phase; downstream
 * phases will surface any missing agents at the verify step.
 */
import { TEAM } from '../content/team'
import { AGENCY_FOUNDED_AT } from '../content/timeline'
import { startResult, type PhaseHandler, type PhaseState } from './_context'

interface TeamSlugDef {
  slug: 'brand' | 'growth' | 'delivery' | 'ops'
  name: string
  color: string
  icon: string
}

const TEAMS: readonly TeamSlugDef[] = [
  { slug: 'brand', name: 'Brand', color: 'rose', icon: 'sparkles' },
  { slug: 'growth', name: 'Growth', color: 'amber', icon: 'trending-up' },
  { slug: 'delivery', name: 'Delivery', color: 'blue', icon: 'package' },
  { slug: 'ops', name: 'Ops', color: 'slate', icon: 'settings' },
]

/**
 * Mapping AgentHire.roleKey → agent_employee_templates.role_key.
 *
 * The hire's roleKey field is descriptive (e.g. 'brand_strategist') but the
 * templates ship a fixed catalog. We map each onto the closest template by
 * domain so AgentOnboardingService.hireReadyEmployee can resolve a template.
 *
 * Available template role_keys (per 20260312143000_agent_employee_templates.sql):
 *   copywriter, designer, analyst, developer, widget_builder, pm_marketing,
 *   pm_product, pm_operations, automation_integrations_engineer,
 *   product_manager, qa_engineer, media_producer, brand_manager, cfo, coach,
 *   brain_scholar.
 */
const ROLE_KEY_MAP: Record<string, string> = {
  brand_strategist: 'brand_manager',
  performance_marketer: 'analyst',
  copywriter: 'copywriter',
  web_developer: 'developer',
  brand_designer: 'designer',
  account_manager: 'pm_marketing',
  operations_manager: 'pm_operations',
}

interface TeamGrant {
  kind:
    | 'integration'
    | 'brain_domain'
    | 'brain_access'
    | 'campaign_context'
    | 'channel'
    | 'mission_type'
    | 'action_domain'
  id: string
}

/** Full runtime + Access-tab coverage for YC demo (agents on teams skip role defaults). */
const DEMO_FULL_ACCESS_GRANTS: readonly TeamGrant[] = [
  { kind: 'brain_access', id: 'personal' },
  { kind: 'campaign_context', id: '*' },
  { kind: 'channel', id: 'slack' },
  { kind: 'channel', id: 'telegram' },
  { kind: 'action_domain', id: 'read_campaign' },
  { kind: 'action_domain', id: 'edit_campaign' },
  { kind: 'action_domain', id: 'read_marketing_artifacts' },
  { kind: 'action_domain', id: 'write_marketing_artifacts' },
  { kind: 'action_domain', id: 'manage_content' },
  { kind: 'action_domain', id: 'manage_tasks_missions' },
  { kind: 'action_domain', id: 'code_projects' },
  { kind: 'action_domain', id: 'custom_db' },
  { kind: 'action_domain', id: 'use_integrations' },
  { kind: 'action_domain', id: 'generate_media' },
  { kind: 'action_domain', id: 'read_brain_personal' },
  { kind: 'action_domain', id: 'read_brain_campaign' },
  { kind: 'action_domain', id: 'read_brain_company' },
  { kind: 'action_domain', id: 'edit_brain_company' },
  { kind: 'action_domain', id: 'write_user_memory' },
  { kind: 'action_domain', id: 'write_brain' },
  { kind: 'action_domain', id: 'edit_brain_models' },
  { kind: 'action_domain', id: 'manage_agents' },
  { kind: 'action_domain', id: 'communicate' },
  { kind: 'action_domain', id: 'use_mcp' },
]

const GRANT_MATRIX: Record<'brand' | 'growth' | 'delivery' | 'ops', readonly TeamGrant[]> = {
  brand: [
    ...DEMO_FULL_ACCESS_GRANTS,
    { kind: 'integration', id: 'slack' },
    { kind: 'integration', id: 'notion' },
    { kind: 'integration', id: 'figma' },
    { kind: 'brain_domain', id: 'positioning' },
    { kind: 'brain_domain', id: 'voice' },
    { kind: 'brain_domain', id: 'narrative' },
    { kind: 'channel', id: 'acme' },
    { kind: 'channel', id: 'beta' },
    { kind: 'channel', id: 'gamma' },
    { kind: 'channel', id: 'delta' },
    { kind: 'channel', id: 'epsilon' },
    { kind: 'channel', id: 'zeta' },
  ],
  growth: [
    ...DEMO_FULL_ACCESS_GRANTS,
    { kind: 'integration', id: 'slack' },
    { kind: 'integration', id: 'meta' },
    { kind: 'integration', id: 'google_ads' },
    { kind: 'integration', id: 'linear' },
    { kind: 'brain_domain', id: 'paid-acquisition' },
    { kind: 'brain_domain', id: 'growth-experiments' },
  ],
  delivery: [
    ...DEMO_FULL_ACCESS_GRANTS,
    { kind: 'integration', id: 'slack' },
    { kind: 'integration', id: 'github' },
    { kind: 'integration', id: 'linear' },
    { kind: 'integration', id: 'notion' },
    { kind: 'brain_domain', id: 'web-development' },
    { kind: 'brain_domain', id: 'accounts' },
  ],
  ops: [
    ...DEMO_FULL_ACCESS_GRANTS,
    { kind: 'integration', id: 'slack' },
    { kind: 'integration', id: 'stripe' },
    { kind: 'integration', id: 'notion' },
    { kind: 'brain_domain', id: 'operations' },
    { kind: 'brain_domain', id: 'pricing' },
  ],
}

interface HireResponse {
  ok: boolean
  role_key: string
  agent: { agent_key: string; [k: string]: unknown }
}

function deriveAgentKey(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || 'agent'
  )
}

function isGatewaySyncFailure(message: string): boolean {
  return /created but sync failed|skill sync failed|gateway/i.test(message)
}

function ensureDryRunBootstrap(state: PhaseState, idFn: (...parts: string[]) => string): void {
  if (!state.orgId) {
    state.orgId = idFn('org', 'foundry-creative')
  }
  if (!state.founderUserId) {
    state.founderUserId = idFn('user', 'founder')
  }
}

export const runP04Team: PhaseHandler = async (ctx) => {
  const r = startResult('04-team')
  const { state, log, supabase, api, ids, dryRun, timeline } = ctx

  if (dryRun && (!state.orgId || !state.founderUserId)) {
    ensureDryRunBootstrap(state, ids.id)
    log.step('Dry-run isolation: synthesized state.orgId + state.founderUserId')
  }

  const orgId = state.orgId
  const founderUserId = state.founderUserId
  if (!orgId) throw new Error('P4 requires state.orgId (set by P1)')
  if (!founderUserId) throw new Error('P4 requires state.founderUserId (set by P1)')

  const warnings: string[] = []
  const rowCounts: Record<string, number> = {
    'agents_registry (hired)': 0,
    agent_definitions: 0,
    agent_skills: 0,
    'ns_brains (scope=agent)': 0,
    agent_teams: 0,
    agent_team_grants: 0,
  }

  state.hiredAgentKeys = []
  state.agentBrainIds = state.agentBrainIds ?? {}
  state.agentTeamIds = {}

  // ─── 1) Hire 7 named agents ────────────────────────────────────────────
  log.step(`Hiring ${TEAM.length} named agents via /internal/agents/hire-ready`)
  for (const hire of TEAM) {
    const mappedRoleKey = ROLE_KEY_MAP[hire.roleKey]
    if (!mappedRoleKey) {
      throw new Error(
        `No role_key mapping for hire "${hire.name}" (${hire.roleKey}). Update ROLE_KEY_MAP.`,
      )
    }
    if (mappedRoleKey !== hire.roleKey) {
      log.step(
        `  ${hire.name}: hire.roleKey="${hire.roleKey}" → template role_key="${mappedRoleKey}"`,
      )
    }

    const fallbackAgentKey = deriveAgentKey(hire.name)
    let agentKey: string = fallbackAgentKey

    if (dryRun) {
      log.step(
        `  [dry-run] would POST /internal/agents/hire-ready { role_key: "${mappedRoleKey}", name: "${hire.name}" } → agent_key="${fallbackAgentKey}"`,
      )
    } else {
      // Idempotency: skip hire if an agent with this name already exists in the org.
      const { data: existing } = await supabase
        .from('agents_registry')
        .select('agent_key')
        .eq('org_id', orgId)
        .eq('name', hire.name)
        .is('user_id', null)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (existing?.agent_key) {
        agentKey = String(existing.agent_key)
        log.step(`  ${hire.name} → agent_key="${agentKey}" (already hired, skipping)`)
        state.hiredAgentKeys.push(agentKey)
        if (hire.deepBrain) {
          state.agentBrainIds![agentKey] = ids.id('ns-brain-agent', orgId, agentKey)
        }
        rowCounts['agents_registry (hired)'] = (rowCounts['agents_registry (hired)'] ?? 0) + 1
        continue
      }
      try {
        const resp = await api.post<
          {
            user_id: string
            org_id: string
            role_key: string
            name: string
            team_id: string | null
          },
          HireResponse
        >('/internal/agents/hire-ready', {
          user_id: founderUserId,
          org_id: orgId,
          role_key: mappedRoleKey,
          name: hire.name,
          team_id: null,
        })
        if (!resp || typeof resp !== 'object' || !resp.agent || !resp.agent.agent_key) {
          throw new Error(`Hire response missing agent.agent_key for "${hire.name}"`)
        }
        agentKey = String(resp.agent.agent_key)
        log.step(`  ${hire.name} → agent_key="${agentKey}"`)
      } catch (err) {
        const message = (err as Error).message
        if (isGatewaySyncFailure(message)) {
          const warning = `Gateway sync failed for "${hire.name}" (role=${mappedRoleKey}): ${message}. Agent may have been rolled back by the API; downstream phases will surface this.`
          log.warn(warning)
          warnings.push(warning)
          continue
        }
        throw new Error(`Hire failed for "${hire.name}" (role=${mappedRoleKey}): ${message}`)
      }

      // Backdate registry + definitions to hire date.
      const hiredAtIso = timeline.iso(hire.hiredAt)
      {
        const { error: regErr } = await supabase
          .from('agents_registry')
          .update({ created_at: hiredAtIso, updated_at: hiredAtIso })
          .eq('agent_key', agentKey)
          .eq('org_id', orgId)
          .is('user_id', null)
        if (regErr) {
          throw new Error(`Backdate agents_registry failed for ${agentKey}: ${regErr.message}`)
        }
      }
      {
        const { error: defErr } = await supabase
          .from('agent_definitions')
          .update({ created_at: hiredAtIso, updated_at: hiredAtIso })
          .eq('agent_key', agentKey)
          .eq('org_id', orgId)
          .is('user_id', null)
        if (defErr) {
          throw new Error(`Backdate agent_definitions failed for ${agentKey}: ${defErr.message}`)
        }
      }
    }

    state.hiredAgentKeys.push(agentKey)
    rowCounts['agents_registry (hired)'] = (rowCounts['agents_registry (hired)'] ?? 0) + 1

    // ─── Agent brain for deepBrain hires (Maya/Leo/Sara/Devon/Casey) ───
    if (hire.deepBrain) {
      const brainId = ids.id('ns-brain-agent', orgId, agentKey)
      const hiredAtIso = timeline.iso(hire.hiredAt)
      if (!dryRun) {
        const { error: brainErr } = await supabase.from('ns_brains').upsert(
          {
            id: brainId,
            owner_id: founderUserId,
            org_id: orgId,
            scope: 'agent',
            agent_id: agentKey,
            name: `${hire.name}'s Brain`,
            description: `Personal knowledge brain for ${hire.name} (${hire.title}).`,
            created_at: hiredAtIso,
            updated_at: hiredAtIso,
          },
          { onConflict: 'id', ignoreDuplicates: false },
        )
        if (brainErr) {
          throw new Error(`Create ns_brains for ${agentKey} failed: ${brainErr.message}`)
        }
      } else {
        log.step(`  [dry-run] would INSERT ns_brains scope=agent agent_id="${agentKey}"`)
      }
      state.agentBrainIds[agentKey] = brainId
      rowCounts['ns_brains (scope=agent)'] = (rowCounts['ns_brains (scope=agent)'] ?? 0) + 1
    }
  }

  // ─── 2) Create 4 agent_teams ───────────────────────────────────────────
  const agencyFoundedIso = timeline.iso(AGENCY_FOUNDED_AT)
  log.step(`Creating ${TEAMS.length} agent_teams (org-scoped)`)
  for (const teamDef of TEAMS) {
    const teamId = ids.id('agent-team', orgId, teamDef.slug)
    if (dryRun) {
      log.step(
        `  [dry-run] would INSERT agent_teams { id: "${teamId}", name: "${teamDef.name}", color: "${teamDef.color}", icon: "${teamDef.icon}" }`,
      )
    } else {
      const { error: teamErr } = await supabase.from('agent_teams').upsert(
        {
          id: teamId,
          org_id: orgId,
          user_id: null,
          name: teamDef.name,
          color: teamDef.color,
          icon: teamDef.icon,
          is_system: false,
          created_at: agencyFoundedIso,
          updated_at: agencyFoundedIso,
        },
        { onConflict: 'id', ignoreDuplicates: false },
      )
      if (teamErr) {
        throw new Error(`Create agent_teams "${teamDef.name}" failed: ${teamErr.message}`)
      }
    }
    state.agentTeamIds[teamDef.slug] = teamId
    rowCounts['agent_teams'] = (rowCounts['agent_teams'] ?? 0) + 1
  }

  // ─── 3) Assign hired agents to their teams ────────────────────────────
  log.step('Assigning hired agents to teams (UPDATE agents_registry.team_id)')
  for (const hire of TEAM) {
    const agentKey = deriveAgentKey(hire.name)
    if (!state.hiredAgentKeys.includes(agentKey)) {
      // Skipped earlier (gateway sync warning); don't try to assign.
      continue
    }
    const teamId = state.agentTeamIds[hire.team]
    if (!teamId) {
      throw new Error(`No team id for "${hire.team}" — TEAMS / state.agentTeamIds out of sync.`)
    }
    if (dryRun) {
      log.step(`  [dry-run] would UPDATE agents_registry.team_id for "${agentKey}" → ${hire.team}`)
    } else {
      const { error: assignErr } = await supabase
        .from('agents_registry')
        .update({ team_id: teamId })
        .eq('agent_key', agentKey)
        .eq('org_id', orgId)
        .is('user_id', null)
      if (assignErr) {
        throw new Error(`Assign team_id to ${agentKey} failed: ${assignErr.message}`)
      }
    }
  }

  // ─── 4) Insert agent_team_grants per the locked matrix ────────────────
  log.step('Inserting agent_team_grants per matrix')
  for (const teamDef of TEAMS) {
    const teamId = state.agentTeamIds[teamDef.slug]
    if (!teamId) {
      throw new Error(`Missing team id for "${teamDef.slug}" — cannot create grants.`)
    }
    const grants = GRANT_MATRIX[teamDef.slug]
    if (dryRun) {
      log.step(
        `  [dry-run] team "${teamDef.slug}" would receive ${grants.length} grants: ${grants
          .map((g) => `${g.kind}:${g.id}`)
          .join(', ')}`,
      )
      rowCounts['agent_team_grants'] = (rowCounts['agent_team_grants'] ?? 0) + grants.length
      continue
    }
    const rows = grants.map((g) => ({
      team_id: teamId,
      capability_kind: g.kind,
      capability_id: g.id,
      mode: 'allow' as const,
      metadata: {},
      created_at: agencyFoundedIso,
    }))
    const { error: grantErr } = await supabase.from('agent_team_grants').upsert(rows, {
      onConflict: 'team_id,capability_kind,capability_id',
      ignoreDuplicates: false,
    })
    if (grantErr) {
      throw new Error(`Insert agent_team_grants for "${teamDef.slug}" failed: ${grantErr.message}`)
    }
    rowCounts['agent_team_grants'] = (rowCounts['agent_team_grants'] ?? 0) + rows.length
  }

  return r.finish(rowCounts, warnings)
}
