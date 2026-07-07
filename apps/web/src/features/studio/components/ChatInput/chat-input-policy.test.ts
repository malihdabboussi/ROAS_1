import { describe, expect, it } from 'vitest'
import {
  applyComposerPolicyOverride,
  applyComposerSystemAccessPolicy,
  composerPolicyOverridesPayload,
  composerPolicyRowLocked,
  composerPolicyRowState,
  type ComposerPolicy,
} from './chat-input-policy'

function composerPolicy(): ComposerPolicy {
  return {
    grants: [
      { kind: 'action_domain', id: 'read_campaign' },
      { kind: 'integration', id: 'stripe' },
    ],
    overrides: {
      allow_extra: [{ kind: 'action_domain', id: 'generate_media' }],
      deny: [{ kind: 'integration', id: 'stripe' }],
    },
  }
}

describe('chat input composer policy helpers', () => {
  it('resolves row state with override precedence and existing defaults', () => {
    const policy = composerPolicy()

    expect(composerPolicyRowState(null, 'action_domain', 'read_campaign')).toBe('unset')
    expect(composerPolicyRowState(policy, 'integration', 'stripe')).toBe('deny')
    expect(composerPolicyRowState(policy, 'action_domain', 'generate_media')).toBe('allow_extra')
    expect(composerPolicyRowState(policy, 'action_domain', 'read_campaign')).toBe('inherited')
    expect(composerPolicyRowState(policy, 'action_domain', 'write_user_memory')).toBe('default')
  })

  it('treats role-default and effective policy capabilities as enabled access', () => {
    const roleDefaultPolicy: ComposerPolicy = {
      role_defaults: [{ kind: 'action_domain', id: 'use_mcp' }],
      grants: [],
      overrides: { allow_extra: [], deny: [] },
    }
    const effectivePolicy: ComposerPolicy = {
      grants: [],
      overrides: { allow_extra: [], deny: [] },
      effective: ['action_domain:communicate'],
    }

    expect(composerPolicyRowState(roleDefaultPolicy, 'action_domain', 'use_mcp')).toBe('default')
    expect(composerPolicyRowState(effectivePolicy, 'action_domain', 'communicate')).toBe('default')
  })

  it('adds protected system-agent access as locked composer defaults', () => {
    const emptyPolicy: ComposerPolicy = {
      grants: [],
      overrides: { allow_extra: [], deny: [] },
    }

    const vibeyPolicy = applyComposerSystemAccessPolicy(
      emptyPolicy,
      'user-123e4567-e89b-42d3-a456-426614174000-vibey',
    )
    const loopPolicy = applyComposerSystemAccessPolicy(emptyPolicy, 'loop')

    expect(composerPolicyRowState(vibeyPolicy, 'action_domain', 'read_campaign')).toBe('default')
    expect(composerPolicyRowLocked(vibeyPolicy, 'action_domain', 'read_campaign')).toBe(true)
    expect(composerPolicyRowState(loopPolicy, 'action_domain', 'manage_tasks_missions')).toBe(
      'default',
    )
    expect(composerPolicyRowLocked(loopPolicy, 'action_domain', 'manage_tasks_missions')).toBe(true)
    expect(composerPolicyRowState(loopPolicy, 'action_domain', 'read_campaign')).toBe('unset')
  })

  it('applies allow and deny overrides while removing stale opposite entries', () => {
    const denied = applyComposerPolicyOverride(
      composerPolicy(),
      'action_domain',
      'generate_media',
      'deny',
    )

    expect(denied.overrides.allow_extra).toEqual([])
    expect(denied.overrides.deny).toContainEqual({ kind: 'action_domain', id: 'generate_media' })

    const allowed = applyComposerPolicyOverride(denied, 'integration', 'stripe', 'allow_extra')

    expect(allowed.overrides.deny).not.toContainEqual({ kind: 'integration', id: 'stripe' })
    expect(allowed.overrides.allow_extra).toContainEqual({ kind: 'integration', id: 'stripe' })
  })

  it('serializes override payload modes', () => {
    expect(composerPolicyOverridesPayload(composerPolicy())).toEqual([
      { kind: 'action_domain', id: 'generate_media', mode: 'allow_extra' },
      { kind: 'integration', id: 'stripe', mode: 'deny' },
    ])
  })
})
