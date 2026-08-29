import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ACTIONS } from '@vibey/agent-policy'
import { VALID_ACTIONS } from '../../artifacts/dtos/artifact-action.dto'
import { ACTION_SCHEMAS } from '../../artifacts/services/artifact-action-schemas'
import { isPromptModeActionOnHold } from '../../artifacts/services/artifact-action-lifecycle'
import { ACTION_METHOD_MAP } from '../../artifacts/services/artifact-action.registry'
import { VIBEY_ALLOWED_ACTIONS } from '../../artifacts/services/artifact-capability.policy'
import { DURABLE_ARTIFACT_OUTPUT_ACTIONS } from '../../shared/ui-block-extractor'
import { VIBEY_API_ACTION_DOCS } from '../data/vibey-api-action-docs'

const CREATION_OUTPUT_ACTIONS = [
  'create_offer',
  'create_avatar',
  'create_funnel',
  'create_website',
  'create_presentation',
  'create_ad',
  'create_ad_campaign',
  'create_sequence',
  'create_social_post',
  'create_pdf',
  'create_docx',
  'generate_image',
  'generate_video',
  'get_video_status',
] as const

function buildDriftRows(): string[] {
  return CREATION_OUTPUT_ACTIONS.flatMap((action) => {
    const missing: string[] = []
    if (!ACTIONS.includes(action)) missing.push('agent_policy')
    if (!VALID_ACTIONS.includes(action)) missing.push('valid_actions')
    if (!ACTION_SCHEMAS[action]) missing.push('action_schema')
    if (!ACTION_METHOD_MAP[action]) missing.push('runtime_registry')
    if (!VIBEY_ALLOWED_ACTIONS.has(action)) missing.push('vibey_policy')
    if (!VIBEY_API_ACTION_DOCS[action]) missing.push('action_docs')
    return missing.length > 0 ? [`${action} | missing: ${missing.join(', ')}`] : []
  })
}

describe('creation output capability drift', () => {
  it('keeps core creation actions executable, permitted, and documented', () => {
    const expectedDrift: string[] = []
    expect(buildDriftRows()).toEqual(expectedDrift)
  })

  it('keeps every durable artifact receipt action registered and active', () => {
    const missing = [...DURABLE_ARTIFACT_OUTPUT_ACTIONS].flatMap((action) => {
      const surfaces: string[] = []
      if (!ACTIONS.includes(action)) surfaces.push('agent_policy')
      if (!VALID_ACTIONS.includes(action)) surfaces.push('valid_actions')
      if (!ACTION_SCHEMAS[action]) surfaces.push('action_schema')
      if (!ACTION_METHOD_MAP[action]) surfaces.push('runtime_registry')
      if (isPromptModeActionOnHold(action)) surfaces.push('on_hold')
      return surfaces.length > 0 ? [`${action} | missing: ${surfaces.join(', ')}`] : []
    })

    expect(missing).toEqual([])
  })

  it('gives every core creation output an explicit receipt path', () => {
    const specializedReceiptActions = new Set([
      'create_pdf',
      'create_docx',
      'generate_image',
      'generate_video',
      'get_video_status',
    ])
    expect(
      CREATION_OUTPUT_ACTIONS.filter(
        (action) =>
          !DURABLE_ARTIFACT_OUTPUT_ACTIONS.has(action) && !specializedReceiptActions.has(action),
      ),
    ).toEqual([])
  })

  it('keeps video polling aligned on the generated job id', () => {
    expect(ACTION_SCHEMAS.get_video_status).toMatchObject({
      required: ['job_id'],
      optional: ['job_id'],
      types: { job_id: 'string' },
    })
    expect(VIBEY_API_ACTION_DOCS.get_video_status.parameters).toContain('"job_id"')

    const runtimeMediaSkill = readFileSync(
      resolve(process.cwd(), '../../docker/agents/atlas/skills/vibey-api/references/media.md'),
      'utf8',
    )
    const videoStatusSection = runtimeMediaSkill.split('## get_video_status')[1]?.split('\n## ')[0]
    expect(videoStatusSection).toContain('**Required keys:** `job_id`')
    expect(videoStatusSection).not.toContain('operation_id')
  })
})
