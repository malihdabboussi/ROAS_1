import { describe, expect, it } from 'vitest'
import {
  ACTION_TO_DOMAIN,
  ACTIONS,
  getActionContract,
  isPromptModeActionOnHold,
  ON_HOLD_PROMPTMODE_ACTIONS,
  type Action,
} from '@vibey/agent-policy'
import { PLUGIN_LOCAL_ACTIONS } from '../../../../../../docker/tools/vibey-backend/index'
import { VALID_ACTIONS } from '../../artifacts/dtos/artifact-action.dto'
import { ACTION_SCHEMAS } from '../../artifacts/services/artifact-action-schemas'
import { ACTION_METHOD_MAP } from '../../artifacts/services/artifact-action.registry'
import { VIBEY_API_ACTION_DOCS } from '../data/vibey-api-action-docs'

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort()
}

function extractDocExamples(action: string): Array<Record<string, unknown>> {
  const parameters = VIBEY_API_ACTION_DOCS[action]?.parameters ?? ''
  const examples: Array<Record<string, unknown>> = []
  const regex = /```json\n([\s\S]*?)```/g
  let match
  while ((match = regex.exec(parameters)) !== null) {
    examples.push(JSON.parse(match[1].trim()) as Record<string, unknown>)
  }
  return examples
}

describe('agent capability source drift guardrail', () => {
  const validActions = new Set<string>(VALID_ACTIONS)
  const activePolicyActions = new Set<string>(ACTIONS)

  it('keeps generated action docs tied to real backend or plugin-local actions', () => {
    // Plugin-local actions (ask_clarification, chat plans) execute inside the
    // vibey-backend plugin and are documented for agents without being backend
    // DTO actions.
    const pluginLocalActions = new Set<string>(PLUGIN_LOCAL_ACTIONS)
    const docsWithoutBackendAction = Object.keys(VIBEY_API_ACTION_DOCS).filter(
      (action) => !validActions.has(action) && !pluginLocalActions.has(action),
    )

    expect(uniqueSorted(docsWithoutBackendAction)).toEqual([])
  })

  it('keeps every active backend action materializable across source surfaces', () => {
    const gaps = VALID_ACTIONS.flatMap((action) => {
      if (isPromptModeActionOnHold(action)) return []

      const missing: string[] = []
      if (!ACTION_SCHEMAS[action]) missing.push('schema')
      if (!ACTION_METHOD_MAP[action]) missing.push('registry')
      if (!activePolicyActions.has(action)) missing.push('policy_action')
      if (!VIBEY_API_ACTION_DOCS[action]) missing.push('generated_docs')

      if (activePolicyActions.has(action)) {
        const policyAction = action as Action
        if (!ACTION_TO_DOMAIN[policyAction]) missing.push('policy_domain')
        if (!getActionContract(policyAction)) missing.push('policy_contract')
      }

      return missing.length > 0 ? [`${action}: ${missing.join('|')}`] : []
    })

    expect(uniqueSorted(gaps)).toEqual([])
  })

  it('keeps Brain log action docs aligned with required brain_type contracts', () => {
    for (const action of ['get_brain_log', 'log_brain_event']) {
      expect(ACTION_SCHEMAS[action]?.required).toContain('brain_type')
      expect(VIBEY_API_ACTION_DOCS[action]?.description).toContain('Required: brain_type')

      for (const example of extractDocExamples(action)) {
        expect(example.action).toBe(action)
        expect(example.data).toMatchObject({ brain_type: expect.any(String) })
      }
    }
  })

  it('documents the canonical Atlas campaign Brain save route', () => {
    const docs = VIBEY_API_ACTION_DOCS.atlas_save_brain_context

    expect(docs.description).toContain('campaign')
    expect(extractDocExamples('atlas_save_brain_context')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'atlas_save_brain_context',
          data: expect.objectContaining({
            target_brain: 'campaign',
            campaign_id: 'UUID',
          }),
        }),
      ]),
    )
  })

  it('keeps named mission playbooks materializable from agent-facing docs', () => {
    expect(ACTION_SCHEMAS.create_mission?.optional).toContain('playbook_id')
    expect(ACTION_SCHEMAS.create_mission?.descriptions?.playbook_id).toContain('task-cleanup')
    expect(VIBEY_API_ACTION_DOCS.create_mission.description).toContain('playbook_id')
    expect(VIBEY_API_ACTION_DOCS.create_mission.description).toContain('task-cleanup')

    const examples = extractDocExamples('create_mission')
    expect(examples).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'create_mission',
          data: expect.objectContaining({
            playbook_id: 'ig-organic-video-ad',
          }),
        }),
      ]),
    )
  })

  it('keeps on-hold backend actions explicit without promoting them to active policy', () => {
    const gaps = ON_HOLD_PROMPTMODE_ACTIONS.flatMap((action) => {
      const missing: string[] = []
      if (!validActions.has(action)) missing.push('backend_action')
      if (!ACTION_SCHEMAS[action]) missing.push('schema')
      if (!ACTION_METHOD_MAP[action]) missing.push('registry')
      if (!isPromptModeActionOnHold(action)) missing.push('lifecycle_on_hold')
      if (activePolicyActions.has(action)) missing.push('not_active_policy_action')
      return missing.length > 0 ? [`${action}: ${missing.join('|')}`] : []
    })

    expect(uniqueSorted(gaps)).toEqual([])
  })
})
