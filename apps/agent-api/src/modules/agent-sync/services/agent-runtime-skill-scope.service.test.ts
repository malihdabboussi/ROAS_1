import { describe, expect, it, vi } from 'vitest'
import {
  buildRuntimeSkillFileRequirements,
  toSafeSkillResourcePath,
  toSkillDirName,
} from './agent-runtime-skill-paths'
import { AgentRuntimeSkillScopeService } from './agent-runtime-skill-scope.service'

function makeQuery(data: unknown[], error: unknown = null) {
  let rows = data
  const query: any = {
    select: vi.fn(() => query),
    or: vi.fn(() => query),
    eq: vi.fn((field: string, value: unknown) => {
      rows = rows.filter((row: any) => row?.[field] === value)
      return query
    }),
    is: vi.fn((field: string, value: null) => {
      rows = rows.filter((row: any) => row?.[field] === value)
      return query
    }),
    in: vi.fn((field: string, values: unknown[]) => {
      rows = rows.filter((row: any) => values.includes(row?.[field]))
      return query
    }),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn(() => Promise.resolve({ data: rows[0] ?? null, error })),
    then: (resolve: any, reject: any) =>
      Promise.resolve({ data: rows, error }).then(resolve, reject),
  }
  return query
}

function makeService(tables: Record<string, unknown[]>) {
  const client = {
    from: vi.fn((table: string) => makeQuery(tables[table] ?? [])),
  }
  return {
    service: new AgentRuntimeSkillScopeService({ client } as any),
    client,
  }
}

describe('AgentRuntimeSkillScopeService', () => {
  it('includes org-scoped vibey skills and resources over global rows', async () => {
    const { service } = makeService({
      agent_skills: [
        {
          id: 'global-skill',
          agent_key: 'vibey',
          skill_key: 'kt-carousel-producer',
          name: 'Global KT',
          description: 'global',
          markdown_content: '# global',
          is_enabled: true,
          archetype_filter: null,
          user_id: null,
          org_id: null,
        },
        {
          id: 'org-skill',
          agent_key: 'vibey',
          skill_key: 'kt-carousel-producer',
          name: 'Org KT',
          description: 'org',
          markdown_content: '# org',
          is_enabled: true,
          archetype_filter: null,
          user_id: null,
          org_id: 'org-1',
        },
      ],
      agent_skill_resources: [
        {
          agent_key: 'vibey',
          skill_key: 'kt-carousel-producer',
          file_path: 'references/kt-design-system.md',
          content: '# global ref',
          content_type: 'text/markdown',
          user_id: null,
          org_id: null,
        },
        {
          agent_key: 'vibey',
          skill_key: 'kt-carousel-producer',
          file_path: 'references/kt-design-system.md',
          content: '# org ref',
          content_type: 'text/markdown',
          user_id: null,
          org_id: 'org-1',
        },
      ],
    })

    const result = await service.resolveRuntimeSkillScope({
      agentKey: 'vibey',
      userId: 'user-1',
      orgId: 'org-1',
      skillKeys: ['kt-carousel-producer'],
    })

    expect(result.skills).toHaveLength(1)
    expect(result.skills[0]?.id).toBe('org-skill')
    expect(result.resources).toHaveLength(1)
    expect(result.resources[0]?.content).toBe('# org ref')
    expect(result.requiredSkillFiles.map((file) => file.filePath)).toEqual([
      'skills/kt-carousel-producer/SKILL.md',
      'skills/kt-carousel-producer/references/kt-design-system.md',
    ])
  })

  it('includes personal user-scoped system-agent skills over global rows', async () => {
    const { service } = makeService({
      agent_skills: [
        {
          id: 'global-skill',
          agent_key: 'vibey',
          skill_key: 'bug-checking-and-report',
          name: 'Global Bug Report',
          description: 'global',
          markdown_content: '# global',
          is_enabled: true,
          archetype_filter: null,
          user_id: null,
          org_id: null,
        },
        {
          id: 'user-skill',
          agent_key: 'vibey',
          skill_key: 'bug-checking-and-report',
          name: 'User Bug Report',
          description: 'user',
          markdown_content: '# user',
          is_enabled: true,
          archetype_filter: null,
          user_id: 'user-1',
          org_id: null,
        },
      ],
      agent_skill_resources: [],
    })

    const result = await service.resolveRuntimeSkillScope({
      agentKey: 'vibey',
      userId: 'user-1',
      orgId: null,
      skillKeys: ['bug-checking-and-report'],
    })

    expect(result.skills).toHaveLength(1)
    expect(result.skills[0]?.id).toBe('user-skill')
  })

  it('prefers agent-specific rows over wildcard rows at the same scope', async () => {
    const { service } = makeService({
      agent_skills: [
        {
          id: 'wildcard',
          agent_key: '*',
          skill_key: 'carousel-designer',
          name: 'Wildcard',
          description: 'wildcard',
          markdown_content: '# wildcard',
          is_enabled: true,
          archetype_filter: null,
          user_id: null,
          org_id: 'org-1',
        },
        {
          id: 'specific',
          agent_key: 'lux',
          skill_key: 'carousel-designer',
          name: 'Specific',
          description: 'specific',
          markdown_content: '# specific',
          is_enabled: true,
          archetype_filter: null,
          user_id: null,
          org_id: 'org-1',
        },
      ],
      agent_skill_resources: [],
    })

    const result = await service.resolveRuntimeSkillScope({
      agentKey: 'lux',
      userId: 'user-1',
      orgId: 'org-1',
      skillKeys: ['carousel-designer'],
    })

    expect(result.skills).toHaveLength(1)
    expect(result.skills[0]?.id).toBe('specific')
  })

  it('uses scoped removed resource markers to hide canonical resources', async () => {
    const { service } = makeService({
      agent_skills: [
        {
          id: 'global-skill',
          agent_key: '*',
          skill_key: 'funnel-builder',
          name: 'Funnel Builder',
          description: 'global',
          markdown_content: '# global',
          is_enabled: true,
          archetype_filter: null,
          user_id: null,
          org_id: null,
        },
      ],
      agent_skill_resources: [
        {
          agent_key: '*',
          skill_key: 'funnel-builder',
          file_path: 'references/old.md',
          content: '# canonical old',
          content_type: 'text/markdown',
          user_id: null,
          org_id: null,
        },
        {
          agent_key: 'lux',
          skill_key: 'funnel-builder',
          file_path: 'references/old.md',
          content: null,
          content_type: 'application/vnd.vibey.resource-removed',
          user_id: 'user-1',
          org_id: null,
        },
        {
          agent_key: 'lux',
          skill_key: 'funnel-builder',
          file_path: 'references/new.md',
          content: '# moved copy',
          content_type: 'text/markdown',
          user_id: 'user-1',
          org_id: null,
        },
      ],
    })

    const result = await service.resolveRuntimeSkillScope({
      agentKey: 'lux',
      userId: 'user-1',
      orgId: null,
      skillKeys: ['funnel-builder'],
    })

    expect(result.resources.map((resource) => resource.file_path)).toEqual(['references/new.md'])
    expect(result.requiredSkillFiles.map((file) => file.filePath)).toEqual([
      'skills/funnel-builder/SKILL.md',
      'skills/funnel-builder/references/new.md',
    ])
  })

  it('builds DB skill catalog metadata without markdown content', async () => {
    const { service, client } = makeService({
      agent_skills: [
        {
          id: 'enabled-skill',
          agent_key: 'vibey',
          skill_key: 'bug-checking-and-report',
          name: 'Old Runtime Name',
          description: 'Triage bugs',
          markdown_content: '# should not be selected',
          is_enabled: true,
          archetype_filter: null,
          user_id: null,
          org_id: null,
        },
        {
          id: 'disabled-skill',
          agent_key: 'vibey',
          skill_key: 'disabled-skill',
          name: 'Disabled',
          description: 'disabled',
          markdown_content: '# disabled',
          is_enabled: false,
          archetype_filter: null,
          user_id: null,
          org_id: null,
        },
      ],
    })

    const result = await service.resolveRuntimeSkillCatalog({
      agentKey: 'vibey',
      userId: 'user-1',
      orgId: null,
    })

    expect(result).toEqual({
      source: 'vibey_db',
      entries: [
        {
          id: 'db:bug-checking-and-report',
          skill_key: 'bug-checking-and-report',
          name: 'bug-checking-and-report',
          description: 'Triage bugs',
        },
      ],
    })
    const agentSkillsQuery = (client.from as any).mock.results[0]?.value
    expect(agentSkillsQuery.select.mock.calls[0]?.[0]).not.toContain('markdown_content')
  })

  it('caches DB skill catalog metadata until explicitly busted', async () => {
    const { service, client } = makeService({
      agent_skills: [
        {
          id: 'enabled-skill',
          agent_key: 'vibey',
          skill_key: 'bug-checking-and-report',
          name: 'Bug Report',
          description: 'Triage bugs',
          markdown_content: '# should not be selected',
          is_enabled: true,
          archetype_filter: null,
          user_id: null,
          org_id: null,
        },
      ],
    })
    const input = {
      agentKey: 'vibey',
      userId: 'user-1',
      orgId: null,
    }

    const first = await service.resolveRuntimeSkillCatalog(input)
    first.entries.push({
      id: 'mutated',
      skill_key: 'mutated',
      name: 'mutated',
      description: 'mutated',
    })

    await expect(service.resolveRuntimeSkillCatalog(input)).resolves.toEqual({
      source: 'vibey_db',
      entries: [
        {
          id: 'db:bug-checking-and-report',
          skill_key: 'bug-checking-and-report',
          name: 'bug-checking-and-report',
          description: 'Triage bugs',
        },
      ],
    })
    expect(client.from).toHaveBeenCalledTimes(1)

    service.bustRuntimeSkillCatalogCache({ agentKey: 'vibey', userId: 'user-1', orgId: null })
    await service.resolveRuntimeSkillCatalog(input)
    expect(client.from).toHaveBeenCalledTimes(2)
  })

  it('returns generated markdown for scoped DB skill reads', async () => {
    const { service } = makeService({
      agent_skills: [
        {
          id: 'skill',
          agent_key: 'vibey',
          skill_key: 'bug-checking-and-report',
          name: 'Bug Checking',
          description: 'Triage bugs',
          markdown_content: `---
name: stale-name
description: stale-description
---

# Runtime body`,
          is_enabled: true,
          archetype_filter: null,
          user_id: null,
          org_id: null,
        },
      ],
      agent_skill_resources: [],
    })

    const result = await service.readRuntimeSkill({
      agentKey: 'vibey',
      userId: 'user-1',
      orgId: null,
      skillKey: 'bug-checking-and-report',
    })

    expect(result).toEqual({
      skill_key: 'bug-checking-and-report',
      content_type: 'text/markdown',
      source: 'skill',
      content: `---
name: bug-checking-and-report
description: Triage bugs
---

# Runtime body
`,
    })
  })

  it('returns safe resource reads with library fallback resources', async () => {
    const { service } = makeService({
      agent_skills: [
        {
          id: 'skill',
          agent_key: 'vibey',
          skill_key: 'carousel-designer',
          name: 'Carousel Designer',
          description: 'Design carousels',
          markdown_content: '# skill',
          is_enabled: true,
          archetype_filter: null,
          user_id: null,
          org_id: null,
        },
      ],
      agent_skill_resources: [],
      skill_library_resources: [
        {
          skill_key: 'carousel-designer',
          file_path: 'references/design.md',
          content: '# library ref',
          content_type: 'text/markdown',
          storage_url: null,
        },
      ],
    })

    const result = await service.readRuntimeSkill({
      agentKey: 'vibey',
      userId: 'user-1',
      orgId: null,
      skillKey: 'carousel-designer',
      path: 'references/design.md',
    })

    expect(result).toEqual({
      skill_key: 'carousel-designer',
      path: 'references/design.md',
      content: '# library ref',
      content_type: 'text/markdown',
      source: 'resource',
    })
  })

  it('rejects unsafe DB skill resource reads', async () => {
    const { service } = makeService({
      agent_skills: [
        {
          id: 'skill',
          agent_key: 'vibey',
          skill_key: 'carousel-designer',
          name: 'Carousel Designer',
          description: 'Design carousels',
          markdown_content: '# skill',
          is_enabled: true,
          archetype_filter: null,
          user_id: null,
          org_id: null,
        },
      ],
      agent_skill_resources: [],
    })

    await expect(
      service.readRuntimeSkill({
        agentKey: 'vibey',
        userId: 'user-1',
        orgId: null,
        skillKey: 'carousel-designer',
        path: '../outside.md',
      }),
    ).rejects.toThrow(/Unsafe skill resource path/)
  })
})

describe('agent runtime skill paths', () => {
  it('normalizes skill dir names and builds skill/resource requirements', () => {
    expect(toSkillDirName('Bug Checking & Report')).toBe('bug-checking-report')
    expect(
      buildRuntimeSkillFileRequirements(
        [{ skill_key: 'kt-carousel-producer' }],
        [
          {
            skill_key: 'kt-carousel-producer',
            file_path: 'references/kt-design-system.md',
            content: '# ref',
            content_type: 'text/markdown',
          },
        ],
      ).map((file) => file.filePath),
    ).toEqual([
      'skills/kt-carousel-producer/SKILL.md',
      'skills/kt-carousel-producer/references/kt-design-system.md',
    ])
  })

  it('requires one images manifest plus markdown stubs for image resources', () => {
    expect(
      buildRuntimeSkillFileRequirements(
        [{ skill_key: 'carousel-designer' }],
        [
          {
            skill_key: 'carousel-designer',
            file_path: 'references/type4-01-cover.png',
            content: 'Type 4 Cover',
            content_type: 'image/png',
            storage_url: 'https://example.supabase.co/storage/v1/object/public/skill-assets/a.png',
          },
          {
            skill_key: 'carousel-designer',
            file_path: 'references/type4-02-body.png',
            content: 'Type 4 Body',
            content_type: 'image/png',
            storage_url: 'https://example.supabase.co/storage/v1/object/public/skill-assets/b.png',
          },
        ],
      ).map((file) => file.filePath),
    ).toEqual([
      'skills/carousel-designer/SKILL.md',
      'skills/carousel-designer/references/images.json',
      'skills/carousel-designer/references/type4-01-cover.md',
      'skills/carousel-designer/references/type4-02-body.md',
    ])
  })

  it('keeps text resource requirements unchanged for image-aware skills', () => {
    expect(
      buildRuntimeSkillFileRequirements(
        [{ skill_key: 'carousel-designer' }],
        [
          {
            skill_key: 'carousel-designer',
            file_path: 'references/readme.md',
            content: '# readme',
            content_type: 'text/markdown',
            storage_url: null,
          },
        ],
      ).map((file) => file.filePath),
    ).toEqual([
      'skills/carousel-designer/SKILL.md',
      'skills/carousel-designer/references/readme.md',
    ])
  })

  it('rejects unsafe skill resource paths before runtime file requirements are built', () => {
    expect(toSafeSkillResourcePath('references/readme.md')).toBe('references/readme.md')
    expect(() => toSafeSkillResourcePath('../outside.md')).toThrow(/Unsafe skill resource path/)
    expect(() => toSafeSkillResourcePath('/etc/passwd')).toThrow(/Unsafe skill resource path/)
    expect(() => toSafeSkillResourcePath('references\\outside.md')).toThrow(
      /Unsafe skill resource path/,
    )

    expect(
      buildRuntimeSkillFileRequirements(
        [{ skill_key: 'carousel-designer' }],
        [
          {
            skill_key: 'carousel-designer',
            file_path: '../outside.md',
            content: '# escaped',
            content_type: 'text/markdown',
            storage_url: null,
          },
        ],
      ).map((file) => file.filePath),
    ).toEqual(['skills/carousel-designer/SKILL.md'])
  })
})
