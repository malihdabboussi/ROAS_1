import { describe, expect, it } from 'vitest'
import { VibeyMcpPromptCatalogService } from './vibey-mcp-prompt-catalog.service'
import { VibeyMcpResourceCatalogService } from './vibey-mcp-resource-catalog.service'

const HIDDEN_TOOL_NAMES = [
  'create_agent',
  'get_agent',
  'update_agent',
  'approve_agent_hire',
  'assign_agent_to_campaign',
  'unassign_agent_from_campaign',
  'update_agent_skill',
  'delete_agent_skill',
  'update_agent_skill_resource',
  'delete_agent_skill_resource',
  'copy_skill_resource',
]

function exactTokenPattern(token: string): RegExp {
  return new RegExp(`(^|[^A-Za-z0-9_])${token}([^A-Za-z0-9_]|$)`)
}

describe('Vibey MCP guidance catalogs', () => {
  it('documents the complete Agent Skill workflow including image references', () => {
    const prompt = new VibeyMcpPromptCatalogService().getPrompt('vibey_create_agent_skill')
    const resource = new VibeyMcpResourceCatalogService().getResource(
      'vibey://mcp/workflows/agent-skills',
    )
    const text = [
      prompt?.description,
      ...(prompt?.messages.map((message) => message.content.text) ?? []),
      resource?.text,
    ].join('\n')

    expect(text).toContain('list_agents')
    expect(text).toContain('list_agent_skills')
    expect(text).toContain('create_agent_skill')
    expect(text).toContain('create_agent_skill_reference')
    expect(text).toContain('upload_agent_skill_image_reference')
    expect(text).toContain('database-first')
    expect(text).toContain('agent_skills')
    expect(text).toContain('agent_skill_resources')
    expect(text).toContain('skill-assets')
    expect(text).toContain('description is the trigger surface')
  })

  it('does not direct clients to hidden agent or skill tools', () => {
    const text = [
      new VibeyMcpPromptCatalogService().allPromptText(),
      new VibeyMcpResourceCatalogService().allResourceText(),
    ].join('\n')

    for (const hiddenToolName of HIDDEN_TOOL_NAMES) {
      expect(text).not.toMatch(exactTokenPattern(hiddenToolName))
    }
  })

  it('does not present local skill files as the durable production source of truth', () => {
    const text = [
      new VibeyMcpPromptCatalogService().allPromptText(),
      new VibeyMcpResourceCatalogService().allResourceText(),
    ].join('\n')

    expect(text).toContain('database-first')
    expect(text).toContain('not the production source of truth')
    expect(text).not.toContain('write local SKILL.md')
    expect(text).not.toContain('create a local SKILL.md')
  })

  it('documents mission launch, supervision, and evidence collection', () => {
    const prompt = new VibeyMcpPromptCatalogService().getPrompt('vibey_mission_operations')
    const resource = new VibeyMcpResourceCatalogService().getResource(
      'vibey://mcp/workflows/missions',
    )
    const text = [
      prompt?.description,
      ...(prompt?.messages.map((message) => message.content.text) ?? []),
      resource?.text,
    ].join('\n')

    expect(text).toContain('create_mission')
    expect(text).toContain('get_mission')
    expect(text).toContain('get_mission_plan')
    expect(text).toContain('list_mission_subtasks')
    expect(text).toContain('get_mission_logs')
    expect(text).toContain('get_mission_deliverables')
    expect(text).toContain('idempotency_key')
    expect(text).toContain('PASS')
    expect(text).toContain('FAIL')
    expect(text).toContain('BLOCKED')
  })
})
