import {
  getMcpToolByAction,
  MCP_PERMISSION_GROUPS,
  type McpPermissionGroup,
} from '@vibey/agent-policy'
import { describe, expect, it } from 'vitest'
import { VALID_ACTIONS } from '../../artifacts/dtos/artifact-action.dto'
import {
  ACTION_SCHEMAS,
  validateActionData,
} from '../../artifacts/services/artifact-action-schemas'
import { ACTION_METHOD_MAP } from '../../artifacts/services/artifact-action.registry'
import {
  resolvePolicyActionAllowlist,
  type ArtifactCapabilityPolicy,
} from '../../artifacts/services/artifact-capability.policy'
import { getAgentInstructionContractsForSkill } from '../contracts/agent-instruction-contracts'
import { VIBEY_API_ACTION_DOCS } from '../data/vibey-api-action-docs'
import { generateScopedVibeyApiSkill } from './vibey-api-skill-generator'

const SPACE_BUILDER_ACTIONS = [
  'get_space',
  'list_space_views',
  'get_space_view',
  'list_space_view_items',
  'create_space_field',
  'update_space_field',
  'append_space_field_option',
  'create_space_status',
  'create_space_category',
  'create_space_tag',
  'create_space_view',
  'update_space_view',
] as const

const INTENTIONALLY_UNEXPOSED_SPACE_OBJECT_ACTIONS = [
  'delete_space_field',
  'create_space_view_item',
] as const

type SurfaceId =
  | 'action_schema'
  | 'artifact_action_dto'
  | 'registry_handler'
  | 'action_docs'
  | 'mcp_tool'
  | 'mcp_missions_group'
  | 'loop_policy'
  | 'managed_space_policy'

type DriftRow = {
  action: string
  missing: SurfaceId[]
}

const loopPolicy: ArtifactCapabilityPolicy = {
  profile: 'system_flows',
  level: 'system',
  domain: 'flows',
}

const managedMarketingPolicy: ArtifactCapabilityPolicy = {
  profile: 'managed_domain',
  level: 'employee',
  domain: 'marketing',
}

const EXPECTED_SPACE_BUILDER_DRIFT: string[] = []

describe('Space builder capability drift', () => {
  it('keeps a known-gap baseline across shared Space-builder exposure layers', () => {
    expect(buildSpaceBuilderDriftRows().map(formatDriftRow)).toEqual(
      EXPECTED_SPACE_BUILDER_DRIFT,
    )
  })

  it('teaches Space schema mutation generically whenever the field actions are available', () => {
    const availableActions = new Set([
      'get_space',
      'create_space_field',
      'update_space_field',
      'append_space_field_option',
      'create_space_status',
      'create_space_category',
      'create_space_tag',
      'create_space_view',
      'update_space_view',
    ])
    const contracts = getAgentInstructionContractsForSkill('vibey-api', availableActions)
    const generated = generateScopedVibeyApiSkill(availableActions, 'flows')
    const output = [generated.skillMd, ...Object.values(generated.referenceFiles)].join('\n')

    expect(contracts.map((contract) => contract.id)).toContain('space-schema-mutation-protocol')
    expect(output).toContain('Space Schema Mutation Protocol')
    expect(output).toContain('Adding a status is a `create_space_status` call')
    expect(output).toContain('For categories and tags, use `create_space_category`')
    expect(output).toContain('## create_space_field')
    expect(output).toContain('## update_space_field')
    expect(output).toContain('## create_space_status')
    expect(output).toContain('## append_space_field_option')
  })

  it('accepts the status/tag/category option path through update_space_field', () => {
    expect(
      validateActionData('append_space_field_option', {
        space_id: 'space-1',
        field_id: 'status',
        id: 'research',
        label: 'RESEARCH',
        color: 'violet',
      }),
    ).toBeNull()

    expect(
      validateActionData('create_space_field', {
        space_id: 'space-1',
        name: 'Launch Tags',
        type: 'multi_select',
        options: [{ label: 'Hot' }, { label: 'Warm', color: 'orange' }],
      }),
    ).toBeNull()

    expect(
      validateActionData('create_space_status', {
        space_id: 'space-1',
        label: 'RESEARCH',
        color: 'violet',
      }),
    ).toBeNull()

    expect(
      validateActionData('create_space_tag', {
        space_id: 'space-1',
        label: 'Urgent',
      }),
    ).toBeNull()

    expect(
      validateActionData('create_space_category', {
        space_id: 'space-1',
        label: 'Research',
      }),
    ).toBeNull()
  })

  it('accepts direct Space view creation and update payloads', () => {
    expect(
      validateActionData('create_space_view', {
        space_id: 'space-1',
        name: 'Research Board',
        view_type: 'kanban',
        visible_field_ids: ['status', 'title', 'tags'],
      }),
    ).toBeNull()

    expect(
      validateActionData('update_space_view', {
        space_id: 'space-1',
        view_id: 'research_board',
        name: 'Research Pipeline',
        visible_field_ids: ['status', 'title'],
      }),
    ).toBeNull()
  })

  it('keeps destructive or generic Space-object actions intentionally unexposed', () => {
    for (const action of INTENTIONALLY_UNEXPOSED_SPACE_OBJECT_ACTIONS) {
      expect(ACTION_SCHEMAS[action]).toBeUndefined()
      expect(VALID_ACTIONS).not.toContain(action)
      expect(ACTION_METHOD_MAP).not.toHaveProperty(action)
      expect(getMcpToolByAction(action)).toBeUndefined()
    }
  })
})

function buildSpaceBuilderDriftRows(): DriftRow[] {
  return SPACE_BUILDER_ACTIONS.map((action) => ({
    action,
    missing: surfaceChecks()
      .filter((surface) => !surface.has(action))
      .map((surface) => surface.id),
  })).filter((row) => row.missing.length > 0)
}

function surfaceChecks(): Array<{ id: SurfaceId; has: (action: string) => boolean }> {
  const missionsGroup = MCP_PERMISSION_GROUPS.find(
    (group): group is McpPermissionGroup => group.id === 'missions',
  )
  const loopActions = resolvePolicyActionAllowlist(loopPolicy)
  const managedActions = resolvePolicyActionAllowlist(managedMarketingPolicy)

  return [
    { id: 'action_schema', has: (action) => Boolean(ACTION_SCHEMAS[action]) },
    {
      id: 'artifact_action_dto',
      has: (action) => VALID_ACTIONS.includes(action as (typeof VALID_ACTIONS)[number]),
    },
    {
      id: 'registry_handler',
      has: (action) => Object.prototype.hasOwnProperty.call(ACTION_METHOD_MAP, action),
    },
    { id: 'action_docs', has: (action) => Boolean(VIBEY_API_ACTION_DOCS[action]) },
    { id: 'mcp_tool', has: (action) => Boolean(getMcpToolByAction(action)) },
    {
      id: 'mcp_missions_group',
      has: (action) => Boolean(missionsGroup?.includedActions.includes(action as never)),
    },
    { id: 'loop_policy', has: (action) => loopActions.has(action) },
    { id: 'managed_space_policy', has: (action) => managedActions.has(action) },
  ]
}

function formatDriftRow(row: DriftRow): string {
  return `${row.action} | missing: ${row.missing.join(', ')}`
}
