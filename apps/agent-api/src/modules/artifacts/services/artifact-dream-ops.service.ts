import { parseDreamOpsSessionKey } from './artifact-action.registry'

type DreamRun = {
  id: string
  org_id: string
  user_id?: string | null
  operation_type: string
  subject_kind: string
  subject_key: string
  status: string
  window_start?: string | null
  window_end?: string | null
  output?: Record<string, unknown> | null
}

type DreamContext = {
  run: DreamRun
  orgId: string
  userId: string
  agentKey: string
  runId: string
}

const ACTIVE_PROPOSAL_STATUSES = [
  'ready',
  'routed_out',
  'experiment_running',
  'revising',
  'inconclusive',
]
const TARGET_ARTIFACT_KINDS = new Set(['skill', 'skill_resource', 'agent_file', 'tool_schema'])
const ROUTE_OUT_TYPES = new Set([
  'system_artifact_internal_review',
  'product_fix_proposal',
  'unsupported_scope',
])

export class ArtifactDreamOpsService {
  getHandlers(target: Record<string, any>) {
    return {
      dream_inspect_agent: (data: Record<string, unknown>, sessionKey?: string) =>
        this.dreamInspectAgent(target, data, sessionKey),
      dream_search_evidence: (data: Record<string, unknown>, sessionKey?: string) =>
        this.dreamSearchEvidence(target, data, sessionKey),
      dream_propose_skill_create: (data: Record<string, unknown>, sessionKey?: string) =>
        this.dreamPropose(target, data, sessionKey, {
          proposalKind: 'skill_create',
          artifactKind: 'skill',
          customerVisible: true,
        }),
      dream_propose_skill_update: (data: Record<string, unknown>, sessionKey?: string) =>
        this.dreamPropose(target, data, sessionKey, {
          proposalKind: 'skill_update',
          artifactKind: 'skill',
          customerVisible: true,
        }),
      dream_propose_skill_resource_update: (data: Record<string, unknown>, sessionKey?: string) =>
        this.dreamPropose(target, data, sessionKey, {
          proposalKind: 'skill_resource_update',
          artifactKind: 'skill_resource',
          customerVisible: true,
        }),
      dream_propose_agent_file_update: (data: Record<string, unknown>, sessionKey?: string) =>
        this.dreamPropose(target, data, sessionKey, {
          proposalKind: 'agent_file_update',
          artifactKind: 'agent_file',
          customerVisible: true,
        }),
      dream_route_out: (data: Record<string, unknown>, sessionKey?: string) =>
        this.dreamPropose(target, data, sessionKey, {
          proposalKind: 'route_out',
          artifactKind: this.stringValue(data.target_artifact_kind) || 'tool_schema',
          customerVisible: false,
        }),
      dream_finish: (data: Record<string, unknown>, sessionKey?: string) =>
        this.dreamFinish(target, data, sessionKey),
    }
  }

  private async resolveDreamContext(
    target: Record<string, any>,
    sessionKey?: string,
  ): Promise<DreamContext | { error: Record<string, unknown> }> {
    const session = parseDreamOpsSessionKey(sessionKey)
    if (!session || session.agentKey !== 'hr') {
      return { error: this.error('dream_ops_session_required', 'HR Dream Ops session is required') }
    }

    const { data, error } = await target.serviceClient
      .from('dream_ops_runs')
      .select(
        'id, org_id, user_id, operation_type, subject_kind, subject_key, status, window_start, window_end, output',
      )
      .eq('id', session.runId)
      .maybeSingle()

    if (error) {
      return { error: this.error('dream_ops_run_lookup_failed', String(error.message || error)) }
    }
    const run = data as DreamRun | null
    if (!run) return { error: this.error('dream_ops_run_not_found', 'Dream Ops run not found') }
    if (run.org_id !== session.orgId) {
      return { error: this.error('dream_ops_org_mismatch', 'Dream Ops org does not match session') }
    }
    if (run.user_id && run.user_id !== session.userId) {
      return { error: this.error('dream_ops_user_mismatch', 'Dream Ops user does not match run') }
    }
    if (run.operation_type !== 'agent_learning_dream') {
      return { error: this.error('dream_ops_operation_invalid', 'Run is not an agent learning dream') }
    }
    if (run.subject_kind !== 'agent' || !run.subject_key) {
      return { error: this.error('dream_ops_subject_invalid', 'Run subject is not an agent') }
    }
    if (run.status !== 'running') {
      return { error: this.error('dream_ops_run_not_running', 'Dream Ops run is not running') }
    }

    return {
      run,
      orgId: session.orgId,
      userId: session.userId,
      agentKey: run.subject_key,
      runId: session.runId,
    }
  }

  private async dreamInspectAgent(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const context = await this.resolveDreamContext(target, sessionKey)
    if ('error' in context) return context.error
    const requestedAgent = this.stringValue(data.agent_key)
    if (requestedAgent && requestedAgent !== context.agentKey) {
      return this.error('dream_ops_subject_mismatch', 'Can only inspect the run subject agent')
    }

    const { data: agent } = await target.serviceClient
      .from('agents_registry')
      .select('id, agent_key, name, role, level, org_id, user_id, instructions, updated_at')
      .eq('org_id', context.orgId)
      .eq('agent_key', context.agentKey)
      .maybeSingle()

    const { data: skills } = await target.serviceClient
      .from('agent_skills')
      .select('id, skill_key, name, description, markdown_content, resources, updated_at')
      .eq('org_id', context.orgId)
      .eq('agent_key', context.agentKey)
      .order('skill_key', { ascending: true })

    return {
      success: true,
      agent_key: context.agentKey,
      agent: agent ?? null,
      skills: Array.isArray(skills) ? skills : [],
    }
  }

  private async dreamSearchEvidence(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const context = await this.resolveDreamContext(target, sessionKey)
    if ('error' in context) return context.error
    const source = this.stringValue(data.source) || 'skill_recommendation_events'
    const limit = Math.max(1, Math.min(50, Number(data.limit || 25)))
    const table = this.allowedEvidenceTable(source)
    if (!table) return this.error('dream_ops_evidence_source_invalid', 'Unsupported evidence source')

    let query = target.serviceClient
      .from(table)
      .select('*')
      .eq('org_id', context.orgId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (context.run.window_start) query = query.gte('created_at', context.run.window_start)
    if (context.run.window_end) query = query.lt('created_at', context.run.window_end)
    if (table === 'space_item_activity') {
      query = query.eq('actor_kind', 'agent')
    } else {
      query = query.eq('agent_key', context.agentKey)
    }

    const { data: rows, error } = await query
    if (error) return this.error('dream_ops_evidence_lookup_failed', String(error.message || error))
    return { success: true, source: table, evidence: Array.isArray(rows) ? rows : [] }
  }

  private async dreamPropose(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey: string | undefined,
    options: { proposalKind: string; artifactKind: string; customerVisible: boolean },
  ) {
    const context = await this.resolveDreamContext(target, sessionKey)
    if ('error' in context) return context.error

    const targetKey = this.targetArtifactKey(data, options)
    if (!targetKey) return this.error('dream_ops_target_required', 'target_artifact_key is required')

    const artifactKind =
      options.proposalKind === 'route_out'
        ? this.stringValue(data.target_artifact_kind) || options.artifactKind
        : options.artifactKind
    if (!TARGET_ARTIFACT_KINDS.has(artifactKind)) {
      return this.error('dream_ops_artifact_kind_invalid', 'Unsupported proposal artifact kind')
    }
    const routeOutType = this.stringValue(data.route_out_type) || null
    if (options.proposalKind === 'route_out' && (!routeOutType || !ROUTE_OUT_TYPES.has(routeOutType))) {
      return this.error('dream_ops_route_out_type_invalid', 'Unsupported route-out type')
    }
    const proposal = {
      proposal_kind: options.proposalKind,
      target_agent_key: context.agentKey,
      target_artifact_kind: artifactKind,
      target_artifact_key: targetKey,
      priority_score: this.priorityScore(data.priority_score),
      evidence_refs: Array.isArray(data.evidence_refs) ? data.evidence_refs : [],
      reason: this.stringValue(data.reason),
      proposed_patch: this.objectValue(data.proposed_patch),
      route_out_type: routeOutType,
      skill_key: this.stringValue(data.skill_key) || targetKey,
      name: this.stringValue(data.name),
      description: this.stringValue(data.description),
      markdown_content: this.markdownContent(data),
      resources: Array.isArray(data.resources) ? data.resources : [],
    }

    const active = await this.findActiveRecommendation(target, context, proposal)
    if (active) {
      const { data: updated, error } = await target.serviceClient
        .from('agent_improvement_proposals')
        .update(
          this.recommendationPayload(
            context,
            String(active.candidate_id),
            proposal,
            options.customerVisible,
          ),
        )
        .eq('id', active.id)
        .select('id')
        .single()
      if (error) return this.error('dream_ops_proposal_update_failed', String(error.message || error))
      return { success: true, recommendation_id: String(updated?.id || active.id), patched: true }
    }

    const candidate = await this.upsertCandidate(target, context, proposal)
    if ('error' in candidate) return candidate.error
    const { data: inserted, error } = await target.serviceClient
      .from('agent_improvement_proposals')
      .upsert(this.recommendationPayload(context, candidate.id, proposal, options.customerVisible), {
        onConflict: 'candidate_id',
      })
      .select('id')
      .single()
    if (error) return this.error('dream_ops_proposal_insert_failed', String(error.message || error))
    return { success: true, recommendation_id: String(inserted?.id || '') }
  }

  private async dreamFinish(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const context = await this.resolveDreamContext(target, sessionKey)
    if ('error' in context) return context.error
    const output = {
      ...(this.objectValue(context.run.output) as Record<string, unknown>),
      dream_finish: {
        summary: this.stringValue(data.summary),
        proposal_count:
          typeof data.proposal_count === 'number' && Number.isFinite(data.proposal_count)
            ? data.proposal_count
            : null,
        no_action_reason: this.stringValue(data.no_action_reason) || null,
        finished_at: new Date().toISOString(),
      },
    }
    const { error } = await target.serviceClient
      .from('dream_ops_runs')
      .update({ output })
      .eq('id', context.runId)
    if (error) return this.error('dream_ops_finish_failed', String(error.message || error))
    return { success: true, run_id: context.runId }
  }

  private async findActiveRecommendation(
    target: Record<string, any>,
    context: DreamContext,
    proposal: Record<string, unknown>,
  ): Promise<{ id: string; candidate_id: string } | null> {
    const { data, error } = await target.serviceClient
      .from('agent_improvement_proposals')
      .select('id, candidate_id')
      .eq('org_id', context.orgId)
      .eq('artifact_lock_key', this.artifactLockKey(context, proposal))
      .in('status', ACTIVE_PROPOSAL_STATUSES)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(`Failed to find active dream proposal: ${error.message}`)
    return (data as { id: string; candidate_id: string } | null) ?? null
  }

  private async upsertCandidate(
    target: Record<string, any>,
    context: DreamContext,
    proposal: Record<string, unknown>,
  ): Promise<{ id: string } | { error: Record<string, unknown> }> {
    const now = new Date().toISOString()
    const fingerprint = [
      'agent_learning_dream',
      context.runId,
      proposal.target_artifact_kind,
      proposal.target_artifact_key,
    ].join(':')
    const { data, error } = await target.serviceClient
      .from('agent_improvement_candidates')
      .upsert(
        {
          org_id: context.orgId,
          agent_key: context.agentKey,
          prompt_fingerprint: fingerprint,
          tool_signature: `dream_ops:${proposal.proposal_kind}`,
          tool_names: [],
          run_count: 1,
          evidence_event_ids: this.uuidEvidenceIds(proposal.evidence_refs),
          first_event_at: now,
          last_event_at: now,
          status: proposal.proposal_kind === 'route_out' ? 'routed_out' : 'recommended',
        },
        { onConflict: 'org_id,agent_key,prompt_fingerprint,tool_signature' },
      )
      .select('id')
      .single()
    if (error) return { error: this.error('dream_ops_candidate_failed', String(error.message || error)) }
    return { id: String(data?.id || '') }
  }

  private recommendationPayload(
    context: DreamContext,
    candidateId: string,
    proposal: Record<string, unknown>,
    customerVisible: boolean,
  ): Record<string, unknown> {
    const patch = this.objectValue(proposal.proposed_patch)
    const skillKey = this.stringValue(proposal.skill_key) || 'agent-file'
    const reason = this.stringValue(proposal.reason)
    const name =
      this.stringValue(proposal.name) ||
      (proposal.proposal_kind === 'route_out' ? 'Internal agent improvement route-out' : 'Skill improvement')
    return {
      org_id: context.orgId,
      candidate_id: candidateId,
      target_agent_key: context.agentKey,
      skill_key: skillKey,
      name: name.slice(0, 160),
      description:
        (this.stringValue(proposal.description) || reason || 'Proposed by Jaime Agent Learning Dream').slice(
          0,
          500,
        ),
      markdown_content: this.stringValue(proposal.markdown_content),
      resources: Array.isArray(proposal.resources) ? proposal.resources : [],
      evidence_event_ids: this.uuidEvidenceIds(proposal.evidence_refs),
      workflow_summary: reason,
      recommended_actions: reason ? [reason] : ['Review proposed change'],
      confidence: Math.max(0, Math.min(1, Number(proposal.priority_score || 0) / 100)),
      status: proposal.proposal_kind === 'route_out' ? 'routed_out' : 'ready',
      proposal_kind: proposal.proposal_kind,
      route_out_type: proposal.route_out_type || null,
      customer_visible: customerVisible,
      target_artifact_kind: proposal.target_artifact_kind,
      target_artifact_key: proposal.target_artifact_key,
      artifact_lock_key: this.artifactLockKey(context, proposal),
      priority_score: proposal.priority_score,
      proposed_patch: patch,
      source_dream_run_id: context.runId,
    }
  }

  private artifactLockKey(context: DreamContext, proposal: Record<string, unknown>): string {
    return [
      context.orgId,
      context.agentKey,
      this.stringValue(proposal.target_artifact_kind) || 'skill',
      this.stringValue(proposal.target_artifact_key) || this.stringValue(proposal.skill_key) || 'agent-file',
    ].join(':')
  }

  private targetArtifactKey(
    data: Record<string, unknown>,
    options: { proposalKind: string; artifactKind: string },
  ): string {
    if (options.proposalKind === 'route_out') {
      return this.stringValue(data.target_artifact_key) || this.stringValue(data.route_out_type)
    }
    if (options.artifactKind === 'skill_resource') {
      const skillKey = this.stringValue(data.skill_key) || this.stringValue(data.target_artifact_key)
      const resourcePath = this.stringValue(data.resource_path)
      return [skillKey, resourcePath].filter(Boolean).join(':')
    }
    return (
      this.stringValue(data.target_artifact_key) ||
      this.stringValue(data.skill_key) ||
      this.stringValue(data.agent_file)
    )
  }

  private markdownContent(data: Record<string, unknown>): string {
    const direct = this.stringValue(data.markdown_content)
    if (direct) return direct
    const patch = this.objectValue(data.proposed_patch)
    return this.stringValue(patch.markdown_content)
  }

  private uuidEvidenceIds(refs: unknown): string[] {
    if (!Array.isArray(refs)) return []
    return refs
      .map((ref) => {
        if (typeof ref === 'string') return ref
        if (ref && typeof ref === 'object') {
          return String((ref as Record<string, unknown>).source_id || '')
        }
        return ''
      })
      .filter((id) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id),
      )
  }

  private allowedEvidenceTable(source: string): string | null {
    const allowed = new Set([
      'skill_recommendation_events',
      'agent_turn_feedback',
      'vb_agent_traces',
      'space_item_activity',
      'missions_logs',
    ])
    return allowed.has(source) ? source : null
  }

  private priorityScore(value: unknown): number {
    const numeric = typeof value === 'number' ? value : Number(value || 0)
    if (!Number.isFinite(numeric)) return 0
    return Math.max(0, Math.min(100, Math.round(numeric)))
  }

  private objectValue(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  }

  private stringValue(value: unknown): string {
    return typeof value === 'string' ? value.trim() : ''
  }

  private error(errorCode: string, message: string): Record<string, unknown> {
    return {
      success: false,
      error: message,
      error_code: errorCode,
      error_class: 'blocked',
      effect_state: 'no_effect',
      retry_policy: 'do_not_retry_same_payload',
      correction: { summary: message },
      agent_instruction: message,
      user_explanation: { sentence: 'This internal dream action could not be completed.' },
      forbidden_user_framing: ['Do not tell the user that a proposal was created.'],
      observability: { fingerprint: `dream_ops.${errorCode}` },
    }
  }
}
