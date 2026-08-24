import { describe, expect, it } from 'vitest'
import { VibeyMcpToolCatalogService } from './vibey-mcp-tool-catalog.service'

describe('VibeyMcpToolCatalogService', () => {
  it('builds JSON schemas from canonical action schemas', () => {
    const tools = new VibeyMcpToolCatalogService().listTools()
    const findTool = (name: string) => tools.find((tool) => String(tool.name) === name)
    const saveUserMemory = findTool('save_user_memory')
    const docsSearch = findTool('search_vibey_docs')
    const spaceSearch = findTool('search_space_context')
    const createSpaceField = findTool('create_space_field')
    const skillReference = findTool('create_agent_skill_reference')
    const imageReference = findTool('upload_agent_skill_image_reference')
    const getMission = findTool('get_mission')
    const listSpaces = findTool('list_spaces')

    expect(saveUserMemory?.inputSchema).toMatchObject({
      type: 'object',
      required: expect.arrayContaining(['content', 'memory_type']),
      properties: expect.objectContaining({
        content: expect.objectContaining({ type: 'string' }),
        memory_type: expect.objectContaining({
          type: 'string',
          enum: ['decision', 'insight', 'preference', 'fact', 'story', 'framework', 'event'],
        }),
      }),
    })
    expect(docsSearch?.inputSchema).toMatchObject({
      type: 'object',
      required: ['query'],
      properties: expect.objectContaining({
        query: expect.objectContaining({
          type: 'string',
          description: expect.stringContaining('Search phrase'),
        }),
        match_count: expect.objectContaining({ type: 'number' }),
      }),
    })
    expect(spaceSearch?.inputSchema).toMatchObject({
      type: 'object',
      required: ['query'],
      properties: expect.objectContaining({
        query: expect.objectContaining({ type: 'string' }),
        source_types: expect.objectContaining({
          type: 'array',
          items: expect.objectContaining({ type: 'string' }),
        }),
        limit: expect.objectContaining({ type: 'number' }),
      }),
    })
    expect(createSpaceField?.inputSchema).toMatchObject({
      type: 'object',
      required: ['space_id', 'name', 'type'],
      properties: expect.objectContaining({
        type: expect.objectContaining({
          type: 'string',
          enum: expect.arrayContaining(['select', 'multi_select', 'text']),
        }),
        options: expect.objectContaining({ type: 'array' }),
        visible_in_view_ids: expect.objectContaining({
          type: 'array',
          items: expect.objectContaining({ type: 'string' }),
        }),
      }),
    })
    expect(skillReference?.inputSchema).toMatchObject({
      type: 'object',
      required: expect.arrayContaining(['agent_key', 'skill_key', 'file_path', 'content']),
      properties: expect.objectContaining({
        file_path: expect.objectContaining({ type: 'string' }),
        content: expect.objectContaining({ type: 'string' }),
      }),
    })
    expect(imageReference?.inputSchema).toMatchObject({
      type: 'object',
      required: expect.arrayContaining(['agent_key', 'skill_key']),
      description: expect.stringContaining('Requires one of: image_url, asset_ref'),
      properties: expect.objectContaining({
        image_url: expect.objectContaining({
          type: 'string',
          description: expect.stringContaining('skill-assets'),
        }),
        asset_ref: expect.objectContaining({ type: 'object' }),
      }),
    })
    expect(getMission?.inputSchema).toMatchObject({
      type: 'object',
      required: ['mission_id'],
      properties: expect.objectContaining({
        mission_id: expect.objectContaining({ type: 'string' }),
      }),
    })
    expect(listSpaces).toMatchObject({
      description: expect.stringContaining('UI General workspace'),
      inputSchema: {
        description: expect.stringContaining('config.system_kind="general"'),
        properties: expect.objectContaining({
          general: expect.objectContaining({
            type: 'boolean',
            description: expect.stringContaining('campaign_id is null'),
          }),
        }),
      },
    })
  })

  it('keeps an explicit fallback note when an action has no schema', () => {
    const tools = new VibeyMcpToolCatalogService().listTools()
    const unschematized = tools.find((tool) => !tool.inputSchema.properties)

    if (!unschematized) return
    expect(unschematized.inputSchema).toMatchObject({
      additionalProperties: true,
      description: expect.stringContaining('describe_vibey_action'),
    })
  })
})
