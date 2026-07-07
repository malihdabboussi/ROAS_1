import { describe, expect, it } from 'vitest'
import { DOMAINS } from './domains.js'
import { ON_HOLD_PROMPTMODE_ACTIONS } from './action-lifecycle.js'
import {
  assertMcpCatalogIntegrity,
  assertNoForbiddenMcpIdentityArgs,
  getAllowedMcpScopesForOrgRole,
  getMcpPermissionGroupsForScopes,
  getMcpSelectableScopes,
  isMcpScope,
  MCP_BASE_SCOPE,
  MCP_PERMISSION_GROUPS,
  MCP_V1_TOOL_CATALOG,
  resolveMcpScopesFromPermissionSelections,
} from './mcp-catalog.js'
import { ACTION_TO_DOMAIN } from './registry.js'

describe('MCP catalog', () => {
  it('references only known actions and domains', () => {
    expect(() => assertMcpCatalogIntegrity()).not.toThrow()
    for (const tool of MCP_V1_TOOL_CATALOG) {
      expect(ACTION_TO_DOMAIN[tool.action]).toBeTruthy()
      for (const scope of tool.requiredScopes) {
        if (scope !== MCP_BASE_SCOPE) {
          expect(DOMAINS).toContain(scope)
        }
      }
    }
  })

  it('does not expose on-hold PromptMode actions through MCP', () => {
    const toolActions = MCP_V1_TOOL_CATALOG.map((tool) => tool.action)
    const groupedActions = MCP_PERMISSION_GROUPS.flatMap((group) => group.includedActions)

    for (const action of ON_HOLD_PROMPTMODE_ACTIONS) {
      expect(toolActions).not.toContain(action)
      expect(groupedActions).not.toContain(action)
    }
  })

  it('keeps destructive and external MCP management actions out of v1', () => {
    const actions = MCP_V1_TOOL_CATALOG.map((tool) => tool.action)
    expect(actions).not.toContain('delete_funnel')
    expect(actions).not.toContain('publish_social_post')
    expect(actions).not.toContain('prepare_email_send')
    expect(actions).not.toContain('supabase_run_sql')
    expect(actions).not.toContain('use_mcp_tool')
    expect(actions).not.toContain('add_mcp_server')
    expect(actions).not.toContain('remove_mcp_server')
    expect(actions).not.toContain('delete_brain_node')
    expect(actions).not.toContain('save_customer_memory')
    expect(actions).not.toContain('ingest_agent_brain_text')
    expect(actions).not.toContain('ingest_agent_brain_link')
    expect(actions).not.toContain('create_agent')
    expect(actions).not.toContain('get_agent')
    expect(actions).not.toContain('update_agent')
    expect(actions).not.toContain('approve_agent_hire')
    expect(actions).not.toContain('assign_agent_to_campaign')
    expect(actions).not.toContain('unassign_agent_from_campaign')
    expect(actions).not.toContain('update_agent_skill')
    expect(actions).not.toContain('delete_agent_skill')
    expect(actions).not.toContain('update_agent_skill_resource')
    expect(actions).not.toContain('delete_agent_skill_resource')
    expect(actions).not.toContain('copy_skill_resource')
  })

  it('exposes read tools for each granted read scope', () => {
    const toolActions = new Set(MCP_V1_TOOL_CATALOG.map((tool) => tool.action))
    expect(toolActions).toContain('list_user_brain_memories')
    expect(toolActions).toContain('list_available_brain_scopes')
    expect(toolActions).toContain('resolve_agent_brain')
    expect(toolActions).toContain('atlas_save_brain_context')
    expect(toolActions).toContain('list_campaigns')
    expect(toolActions).toContain('get_campaign')
    expect(toolActions).toContain('list_funnels')
    expect(toolActions).toContain('list_forms')
    expect(toolActions).toContain('get_form')
    expect(toolActions).toContain('list_form_responses')
    expect(toolActions).toContain('attach_form_asset')
    expect(toolActions).toContain('list_sequences')
    expect(toolActions).toContain('list_missions')
    expect(toolActions).toContain('list_spaces')
    expect(toolActions).toContain('get_space')
    expect(toolActions).toContain('list_space_views')
    expect(toolActions).toContain('get_space_view')
    expect(toolActions).toContain('list_space_view_items')
    expect(toolActions).toContain('get_space_item')
    expect(toolActions).toContain('list_contacts')
    expect(toolActions).toContain('get_contact')
    expect(toolActions).toContain('get_contact_activity')
    expect(toolActions).toContain('list_contact_communications')
    expect(toolActions).toContain('create_contact')
    expect(toolActions).toContain('update_contact')
    expect(toolActions).toContain('add_contact_note')
    expect(toolActions).toContain('update_contact_note')
    expect(toolActions).toContain('create_space_field')
    expect(toolActions).toContain('update_space_field')
    expect(toolActions).toContain('append_space_field_option')
    expect(toolActions).toContain('create_space_status')
    expect(toolActions).toContain('create_space_category')
    expect(toolActions).toContain('create_space_tag')
    expect(toolActions).toContain('create_space_view')
    expect(toolActions).toContain('update_space_view')
    expect(toolActions).toContain('list_tasks')
    expect(toolActions).toContain('get_task')
    expect(toolActions).toContain('get_document')
    expect(toolActions).toContain('search_space_context')
    expect(toolActions).toContain('list_team')
    expect(toolActions).toContain('list_agent_skills')
    expect(toolActions).toContain('create_agent_skill')
    expect(toolActions).toContain('create_agent_skill_resource')
    expect(toolActions).toContain('upload_skill_asset')
  })

  it('exposes Company Brain writes as signal proposals, not raw object creation', () => {
    const toolActions = new Set(MCP_V1_TOOL_CATALOG.map((tool) => tool.action))
    expect(toolActions).toContain('propose_company_brain_signal')
    expect(toolActions).not.toContain('create_company_brain_object')

    const companyGrant = MCP_PERMISSION_GROUPS.find((grant) => grant.id === 'company_brain')
    expect(companyGrant?.includedActions).toContain('propose_company_brain_signal')
    expect(companyGrant?.includedActions).not.toContain('create_company_brain_object')
  })

  it('limits viewer scopes to read-safe scopes', () => {
    const scopes = getAllowedMcpScopesForOrgRole('viewer', false)
    expect(scopes).toContain(MCP_BASE_SCOPE)
    expect(scopes).toContain('read_brain_customer')
    expect(scopes).toContain('read_brain_agent')
    expect(scopes).toContain('read_space_context')
    expect(scopes).toContain('read_contacts')
    expect(scopes).not.toContain('edit_contacts')
    expect(scopes).not.toContain('write_marketing_artifacts')
    expect(scopes).not.toContain('edit_brain_customer')
    expect(scopes).not.toContain('write_brain')
  })

  it('allows creator and editor org roles to read agent brain memories', () => {
    expect(getAllowedMcpScopesForOrgRole('creator', false)).toContain('read_brain_agent')
    expect(getAllowedMcpScopesForOrgRole('editor', false)).toContain('read_brain_agent')
    expect(getAllowedMcpScopesForOrgRole('creator', false)).not.toContain('write_brain')
    expect(getAllowedMcpScopesForOrgRole('editor', false)).not.toContain('write_brain')
  })

  it('rejects body-provided identity fields', () => {
    expect(() => assertNoForbiddenMcpIdentityArgs({ query: 'hello' })).not.toThrow()
    expect(() => assertNoForbiddenMcpIdentityArgs({ user_id: 'user-1' })).toThrow(
      'MCP tool arguments cannot include user_id',
    )
    expect(() => assertNoForbiddenMcpIdentityArgs({ org_id: 'org-1' })).toThrow(
      'MCP tool arguments cannot include org_id',
    )
  })

  it('recognizes read-only permission scopes as valid MCP scopes', () => {
    expect(isMcpScope('read_campaign')).toBe(true)
    expect(isMcpScope('read_marketing_artifacts')).toBe(true)
    expect(getMcpSelectableScopes()).toContain('read_campaign')
  })

  it('maps permission groups to real MCP tools and selectable scopes', () => {
    const toolActions = new Set(MCP_V1_TOOL_CATALOG.map((tool) => tool.action))
    const selectableScopes = getMcpSelectableScopes()
    expect(selectableScopes).toContain(MCP_BASE_SCOPE)
    expect(toolActions.has('search_vibey_docs')).toBe(true)
    expect(
      MCP_PERMISSION_GROUPS.find((group) => group.id === 'assistant_context')?.includedActions,
    ).toContain('search_vibey_docs')

    for (const group of MCP_PERMISSION_GROUPS) {
      for (const action of group.includedActions) {
        expect(toolActions.has(action)).toBe(true)
      }
      for (const scope of [...group.readScopes, ...group.writeScopes]) {
        expect(selectableScopes).toContain(scope)
      }
    }
  })

  it('resolves permission selections into concrete scopes', () => {
    const scopes = resolveMcpScopesFromPermissionSelections({
      personal_brain: 'write',
      customer_brain: 'read',
      campaigns: 'none',
    })
    expect(scopes).toContain(MCP_BASE_SCOPE)
    expect(scopes).toContain('read_brain_personal')
    expect(scopes).toContain('write_user_memory')
    expect(scopes).toContain('read_brain_customer')
    expect(scopes).not.toContain('edit_campaign')
  })

  it('expands base-only authorization requests into all permission groups for consent', () => {
    const grants = getMcpPermissionGroupsForScopes([MCP_BASE_SCOPE], { baseScopeMeansAll: true })
    expect(grants.length).toBe(MCP_PERMISSION_GROUPS.length)
    expect(grants.some((grant) => grant.level === 'write')).toBe(true)
    expect(grants.find((grant) => grant.id === 'agent_brain')?.level).toBe('write')
    expect(grants.find((grant) => grant.id === 'agent_brain')?.includedActions).toContain(
      'search_agent_brain',
    )
    expect(grants.find((grant) => grant.id === 'agent_brain')?.includedActions).toContain(
      'resolve_agent_brain',
    )
    expect(grants.find((grant) => grant.id === 'campaigns')?.readScopes).toContain('read_campaign')
    expect(grants.find((grant) => grant.id === 'campaigns')?.includedActions).toContain(
      'list_campaigns',
    )
    expect(grants.find((grant) => grant.id === 'contacts')?.readScopes).toContain('read_contacts')
    expect(grants.find((grant) => grant.id === 'contacts')?.writeScopes).toContain('edit_contacts')
    expect(grants.find((grant) => grant.id === 'contacts')?.includedActions).toContain(
      'list_contacts',
    )
    expect(grants.find((grant) => grant.id === 'contacts')?.includedActions).toContain(
      'get_contact_activity',
    )
    expect(grants.find((grant) => grant.id === 'contacts')?.includedActions).toContain(
      'add_contact_note',
    )
    expect(grants.find((grant) => grant.id === 'marketing_assets')?.readScopes).toContain(
      'read_marketing_artifacts',
    )
    expect(grants.find((grant) => grant.id === 'space_content')?.readScopes).toContain(
      'manage_content',
    )
    expect(grants.find((grant) => grant.id === 'space_content')?.includedActions).toContain(
      'create_docx',
    )
    expect(grants.find((grant) => grant.id === 'agent_skills')?.readScopes).toContain(
      'manage_own_skills',
    )
    expect(grants.find((grant) => grant.id === 'agent_skills')?.readScopes).not.toContain(
      'manage_team_skills',
    )
    expect(grants.find((grant) => grant.id === 'agent_skills')?.includedActions).toContain(
      'create_agent_skill_resource',
    )
    expect(
      grants.find((grant) => grant.id === 'atlas_brain_save_router')?.includedActions,
    ).toContain('atlas_save_brain_context')
    expect(grants.find((grant) => grant.id === 'space_retrieval')?.readScopes).toContain(
      'read_space_context',
    )
    expect(grants.find((grant) => grant.id === 'space_retrieval')?.includedActions).toContain(
      'search_space_context',
    )
    expect(grants.find((grant) => grant.id === 'missions')?.readScopes).toContain(
      'manage_tasks_missions',
    )
    expect(grants.find((grant) => grant.id === 'missions')?.includedActions).toContain(
      'list_space_views',
    )
    expect(grants.find((grant) => grant.id === 'missions')?.includedActions).toContain(
      'create_space_status',
    )
  })

  it('maps read selections to read-only scopes for mixed permission groups', () => {
    const scopes = resolveMcpScopesFromPermissionSelections({
      campaigns: 'read',
      marketing_assets: 'read',
      space_content: 'read',
      space_retrieval: 'read',
      contacts: 'read',
      missions: 'read',
    })
    expect(scopes).toContain('read_campaign')
    expect(scopes).toContain('read_marketing_artifacts')
    expect(scopes).toContain('manage_content')
    expect(scopes).toContain('read_space_context')
    expect(scopes).toContain('read_contacts')
    expect(scopes).toContain('manage_tasks_missions')
    expect(scopes).not.toContain('edit_campaign')
    expect(scopes).not.toContain('write_marketing_artifacts')
    expect(scopes).not.toContain('edit_contacts')
  })

  it('maps agent brain write selection to write brain scope', () => {
    const scopes = resolveMcpScopesFromPermissionSelections({
      agent_brain: 'write',
    })
    expect(scopes).toContain(MCP_BASE_SCOPE)
    expect(scopes).toContain('read_brain_agent')
    expect(scopes).toContain('write_brain')
  })

  it('maps Atlas Brain save router selection to every routed write scope', () => {
    const scopes = resolveMcpScopesFromPermissionSelections({
      atlas_brain_save_router: 'write',
    })
    expect(scopes).toContain(MCP_BASE_SCOPE)
    expect(scopes).toContain('write_user_memory')
    expect(scopes).toContain('edit_brain_customer')
    expect(scopes).toContain('edit_brain_company')
    expect(scopes).toContain('write_brain')
    expect(scopes).toContain('edit_campaign')
    expect(scopes).toContain('manage_content')
  })

  it('maps Agent Skills selection to manage own skills scope only', () => {
    const scopes = resolveMcpScopesFromPermissionSelections({
      agent_skills: 'write',
    })
    expect(scopes).toContain(MCP_BASE_SCOPE)
    expect(scopes).toContain('manage_own_skills')
    expect(scopes).not.toContain('manage_team_skills')
    expect(scopes).not.toContain('manage_agents')
    expect(scopes).not.toContain('manage_team_identity')
  })
})
