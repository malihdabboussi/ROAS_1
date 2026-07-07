import { describe, expect, it, vi } from 'vitest'
import { SkillRecommendationJaimeService } from '../skill-recommendation-jaime.service'

const baseJob = {
  id: 'job-1',
  user_id: 'user-1',
  org_id: 'org-1',
  candidate_id: 'candidate-1',
  dedupe_key: 'skill-recommendation:candidate-1',
  payload: {},
  status: 'processing' as const,
  attempts: 1,
  max_attempts: 3,
  next_attempt_at: new Date().toISOString(),
  last_error: null,
  result: null,
  started_at: null,
  completed_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const baseCandidate = {
  id: 'candidate-1',
  org_id: 'org-1',
  agent_key: 'designer',
  prompt_fingerprint: 'fp',
  tool_signature: 'create_doc|save_doc',
  tool_names: ['create_doc', 'save_doc'],
  run_count: 3,
  evidence_event_ids: ['event-1', 'event-2', 'event-3'],
  first_event_at: new Date().toISOString(),
  last_event_at: new Date().toISOString(),
  status: 'analysis_processing' as const,
  skip_reason: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const baseEvents = [
  {
    id: 'event-1',
    user_id: 'user-1',
    org_id: 'org-1',
    agent_key: 'designer',
    conversation_id: 'conversation-1',
    trace_id: 'trace-1',
    channel: 'studio',
    prompt_fingerprint: 'fp',
    prompt_excerpt: 'Make the same proposal doc again',
    tool_signature: 'create_doc|save_doc',
    tool_names: ['create_doc', 'save_doc'],
    skill_keys_used: [],
    workflow_keys_used: [],
    status: 'completed' as const,
    created_at: new Date().toISOString(),
  },
]

const baseTraceEvidence = [
  {
    event_id: 'event-1',
    trace_id: 'trace-1',
    user_message: 'Make the same proposal doc again with the same sections',
    agent_response: 'Created the proposal document and saved it.',
    tool_steps_excerpt: '[{"name":"create_doc","status":"completed"}]',
    messages_input_excerpt: '{"messages":[{"role":"user","content":"Make the same proposal"}]}',
    messages_output_excerpt: '[{"role":"assistant","content":"Created"}]',
    system_prompt_excerpt: 'Agent instructions excerpt',
    model: 'anthropic/claude-sonnet-4.6',
    status: 'completed',
    total_tokens: 1200,
    duration_ms: 2500,
    completed_at: new Date().toISOString(),
  },
]

function serviceWithResponse(content: string) {
  const callOpenClawForBrainJob = vi.fn().mockResolvedValue({ content })
  const service = new SkillRecommendationJaimeService({ callOpenClawForBrainJob } as never)
  return { service, callOpenClawForBrainJob }
}

describe('SkillRecommendationJaimeService', () => {
  it('accepts valid recommendation JSON', async () => {
    const { service, callOpenClawForBrainJob } = serviceWithResponse(
      JSON.stringify({
        verdict: 'recommend',
        proposal: {
          target_agent_key: 'designer',
          skill_key: 'proposal-doc-builder',
          name: 'Proposal Doc Builder',
          description: 'Use when building repeat proposal docs.',
          markdown_content: '---\nname: proposal-doc-builder\ndescription: Use this.\n---\n# Steps',
          resources: [
            {
              file_path: 'references/template.md',
              content_type: 'text/markdown',
              content: '# Template',
            },
          ],
          workflow_summary: 'Builds the same proposal document flow.',
          recommended_actions: ['Draft proposal', 'Save document'],
          evidence_event_ids: ['event-1'],
          confidence: 0.88,
          proposal_kind: 'skill_create',
          target_artifact_kind: 'skill',
          target_artifact_key: 'proposal-doc-builder',
          artifact_lock_key: 'org-1:designer:skill:proposal-doc-builder',
          customer_visible: true,
          priority_score: 78,
          proposed_patch: {
            skill_key: 'proposal-doc-builder',
            name: 'Proposal Doc Builder',
          },
        },
      }),
    )

    const result = await service.reviewCandidate({
      job: baseJob,
      candidate: baseCandidate,
      events: baseEvents,
      traceEvidence: baseTraceEvidence,
      existingSkills: [],
    })

    expect(result.verdict).toBe('recommend')
    if (result.verdict === 'recommend') {
      expect(result.proposal.skill_key).toBe('proposal-doc-builder')
      expect(result.proposal.resources[0]?.file_path).toBe('references/template.md')
      expect(result.proposal.proposal_kind).toBe('skill_create')
      expect(result.proposal.artifact_lock_key).toBe(
        'org-1:designer:skill:proposal-doc-builder',
      )
    }
    const systemPrompt = callOpenClawForBrainJob.mock.calls[0]?.[2] as string
    expect(systemPrompt).toContain('Agent Learning Loop scope')
    expect(systemPrompt).toContain('ROLE.md, IDENTITY.md, or SOUL.md')
    expect(systemPrompt).toContain('route_out')
    expect(systemPrompt).toContain('platform-owned tool schema problems')
    expect(callOpenClawForBrainJob).toHaveBeenCalledWith(
      'user-1',
      'hr',
      expect.stringContaining('Trace evidence may include redacted prompts'),
      expect.stringContaining('"trace_evidence"'),
      undefined,
      undefined,
      undefined,
      'org-1',
    )
  })

  it('accepts skip verdicts', async () => {
    const { service } = serviceWithResponse(
      JSON.stringify({ verdict: 'skip', reason: 'Existing skill already covers this.' }),
    )

    const result = await service.reviewCandidate({
      job: baseJob,
      candidate: baseCandidate,
      events: baseEvents,
      existingSkills: [{ skill_key: 'proposal', name: 'Proposal', description: 'Existing' }],
    })

    expect(result).toMatchObject({
      verdict: 'skip',
      reason: 'Existing skill already covers this.',
    })
  })

  it('accepts org-owned agent file update proposals', async () => {
    const { service } = serviceWithResponse(
      JSON.stringify({
        verdict: 'recommend',
        proposal: {
          proposal_kind: 'agent_file_update',
          target_agent_key: 'designer',
          skill_key: 'agent-file-update',
          name: 'Designer Role Boundary Update',
          description: 'Use when Designer repeatedly violates role boundaries.',
          markdown_content: 'not used for agent file proposals',
          resources: [],
          workflow_summary: 'Designer repeatedly handled work outside its lane.',
          recommended_actions: ['Update ROLE.md boundaries'],
          evidence_event_ids: ['event-1', 'event-2', 'event-3'],
          confidence: 0.76,
          customer_visible: true,
          target_artifact_kind: 'agent_file',
          target_artifact_key: 'ROLE.md',
          artifact_lock_key: 'org-1:designer:agent_file:ROLE.md',
          priority_score: 71,
          proposed_patch: {
            file_name: 'ROLE.md',
            content: '# Role\n\nUpdated boundary.',
          },
        },
      }),
    )

    const result = await service.reviewCandidate({
      job: baseJob,
      candidate: baseCandidate,
      events: baseEvents,
      traceEvidence: baseTraceEvidence,
      existingSkills: [],
    })

    expect(result.verdict).toBe('recommend')
    if (result.verdict === 'recommend') {
      expect(result.proposal.proposal_kind).toBe('agent_file_update')
      expect(result.proposal.target_artifact_kind).toBe('agent_file')
      expect(result.proposal.proposed_patch).toEqual({
        file_name: 'ROLE.md',
        content: '# Role\n\nUpdated boundary.',
      })
    }
  })

  it('accepts route-out proposals for platform-owned work without customer visibility', async () => {
    const { service } = serviceWithResponse(
      JSON.stringify({
        verdict: 'recommend',
        proposal: {
          proposal_kind: 'route_out',
          route_out_type: 'product_fix_proposal',
          target_agent_key: 'designer',
          skill_key: 'route-out-tool-schema',
          name: 'Tool Schema Product Fix',
          description: 'Platform-owned tool contract needs engineering review.',
          markdown_content: 'not customer visible',
          resources: [],
          workflow_summary: 'Tool calls failed because the tool schema is wrong.',
          recommended_actions: ['Open product fix proposal for engineering'],
          evidence_event_ids: ['event-1'],
          confidence: 0.9,
          customer_visible: false,
          target_artifact_kind: 'tool_schema',
          target_artifact_key: 'send_to_agent',
          artifact_lock_key: 'platform:designer:tool_schema:send_to_agent',
          priority_score: 88,
          proposed_patch: {
            problem: 'schema mismatch',
          },
        },
      }),
    )

    const result = await service.reviewCandidate({
      job: baseJob,
      candidate: baseCandidate,
      events: baseEvents,
      traceEvidence: baseTraceEvidence,
      existingSkills: [],
    })

    expect(result.verdict).toBe('recommend')
    if (result.verdict === 'recommend') {
      expect(result.proposal.proposal_kind).toBe('route_out')
      expect(result.proposal.route_out_type).toBe('product_fix_proposal')
      expect(result.proposal.customer_visible).toBe(false)
    }
  })

  it('rejects malformed Jaime output', async () => {
    const { service } = serviceWithResponse('not json')

    await expect(
      service.reviewCandidate({
        job: baseJob,
        candidate: baseCandidate,
        events: baseEvents,
        existingSkills: [],
      }),
    ).rejects.toThrow('Jaime response did not contain JSON')
  })
})
