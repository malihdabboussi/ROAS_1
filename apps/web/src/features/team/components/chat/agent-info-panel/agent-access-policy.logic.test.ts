import { describe, expect, it } from 'vitest'
import { ACTION_DOMAIN_ROWS, policyRowState } from '@/lib/agents/agent-access-policy.logic'
import type { ResolvedAgentPolicyJson } from '@/lib/agents/agent-teams.types'

function row(id: string) {
  return ACTION_DOMAIN_ROWS.find((item) => item.id === id)
}

describe('agent access policy rows', () => {
  it('shows regular user memory separately from specialized brain operations', () => {
    expect(row('write_user_memory')).toMatchObject({
      id: 'write_user_memory',
      label: expect.stringMatching(/memory/i),
    })
    expect(row('write_user_memory')?.description).toMatch(/regular|user/i)
    expect(row('write_brain')).toBeUndefined()
  })

  it('does not describe narrative pages as generic managed content', () => {
    expect(row('manage_content')?.description.toLowerCase()).not.toContain('narrative')
  })

  it('makes presentation access explicit in marketing artifact copy', () => {
    expect(row('write_marketing_artifacts')?.description.toLowerCase()).toContain('presentations')
  })

  it('exposes Space Knowledge search and hides invalid campaign-brain domains', () => {
    expect(row('read_space_context')).toMatchObject({
      id: 'read_space_context',
      label: expect.stringMatching(/space knowledge/i),
    })
    expect(row('read_brain_campaign')).toBeUndefined()
  })

  it('does not expose unshipped code or custom database domains as normal toggles', () => {
    expect(row('code_projects')).toBeUndefined()
    expect(row('custom_db')).toBeUndefined()
  })

  it('treats user memory as default-on unless the agent denies it', () => {
    const policy: ResolvedAgentPolicyJson = {
      agent_key: 'lux',
      team_id: null,
      team_name: null,
      role_defaults: [],
      grants: [],
      overrides: { allow_extra: [], deny: [] },
      effective: [],
    }

    expect(policyRowState(policy, 'action_domain', 'write_user_memory')).toBe('default')
    expect(
      policyRowState(
        {
          ...policy,
          overrides: {
            allow_extra: [],
            deny: [{ kind: 'action_domain', id: 'write_user_memory' }],
          },
        },
        'action_domain',
        'write_user_memory',
      ),
    ).toBe('deny')
  })

  it('treats role-default action domains as enabled access', () => {
    const policy: ResolvedAgentPolicyJson = {
      agent_key: 'vibey',
      team_id: null,
      team_name: null,
      role_defaults: [{ kind: 'action_domain', id: 'read_campaign' }],
      grants: [],
      overrides: { allow_extra: [], deny: [] },
      effective: [],
    }

    expect(policyRowState(policy, 'action_domain', 'read_campaign')).toBe('default')
  })

  it('does not expose bundled platform-only campaign settings as normal toggles', () => {
    expect(row('edit_campaign')).toBeUndefined()
  })
})
