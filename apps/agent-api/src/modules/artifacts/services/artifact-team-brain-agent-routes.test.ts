import { afterEach, describe, expect, it, vi } from 'vitest'
import { ArtifactStateMetaIntegrationsGithubTeamBrainService } from './artifact-state-meta-integrations-github-team-brain.service'

vi.mock('node:dns/promises', () => ({
  lookup: vi.fn(async (hostname: string) => {
    if (hostname === 'cdn.example.com') return [{ address: '93.184.216.34', family: 4 }]
    return [{ address: '127.0.0.1', family: 4 }]
  }),
}))

const originalFetch = global.fetch

afterEach(() => {
  global.fetch = originalFetch
  vi.restoreAllMocks()
})

function makeTarget() {
  const storageBucket = {
    upload: vi.fn().mockResolvedValue({ error: null }),
    getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://cdn.example.com/a.png' } }),
  }
  return {
    mainApiCall: vi.fn().mockResolvedValue({ ok: true }),
    parseAgentIdFromSessionKey: vi.fn().mockReturnValue('copywriter'),
    resolveUserId: vi.fn().mockReturnValue('user-1'),
    resolveOrgId: vi.fn().mockReturnValue(null),
    bustRuntimeSkillCatalogCacheForAgent: vi.fn(),
    serviceClient: {
      storage: {
        from: vi.fn().mockReturnValue(storageBucket),
      },
    },
    storageBucket,
  }
}

describe('ArtifactStateMetaIntegrationsGithubTeamBrainService agent routes', () => {
  it('uses /api/agents for list/create/update skill calls', async () => {
    const service = new ArtifactStateMetaIntegrationsGithubTeamBrainService()
    const target = makeTarget()
    const handlers = service.getHandlers(target)

    await handlers.list_agent_skills({ agent_key: 'copywriter' }, 'session-1')
    await handlers.create_agent_skill(
      {
        agent_key: 'copywriter',
        skill_key: 'copy',
        name: 'Copy',
        description: 'Writes copy',
        markdown_content: '# Copy',
      },
      'session-1',
    )
    await handlers.update_agent_skill(
      { agent_key: 'copywriter', skill_id: 'skill-1', name: 'Updated' },
      'session-1',
    )

    expect(target.mainApiCall).toHaveBeenNthCalledWith(
      1,
      'GET',
      '/api/agents/copywriter/skills',
      'session-1',
    )
    expect(target.mainApiCall).toHaveBeenNthCalledWith(
      2,
      'POST',
      '/api/agents/copywriter/skills',
      'session-1',
      expect.objectContaining({ skill_key: 'copy' }),
    )
    expect(target.mainApiCall).toHaveBeenNthCalledWith(
      3,
      'PATCH',
      '/api/agents/copywriter/skills/skill-1',
      'session-1',
      { name: 'Updated' },
    )
    expect(target.bustRuntimeSkillCatalogCacheForAgent).toHaveBeenCalledWith(
      'copywriter',
      'session-1',
    )
  })

  it('uses /api/agents for skill resource creation', async () => {
    const service = new ArtifactStateMetaIntegrationsGithubTeamBrainService()
    const target = makeTarget()
    const handlers = service.getHandlers(target)

    await handlers.create_agent_skill_resource(
      {
        agent_key: 'copywriter',
        skill_key: 'copy',
        file_path: 'docs/example.md',
        content: '# Example',
      },
      'session-1',
    )

    expect(target.mainApiCall).toHaveBeenCalledWith(
      'POST',
      '/api/agents/copywriter/skills/copy/resources',
      'session-1',
      { file_path: 'docs/example.md', content: '# Example' },
    )
    expect(target.bustRuntimeSkillCatalogCacheForAgent).toHaveBeenCalledWith(
      'copywriter',
      'session-1',
    )
  })

  it('blocks private network image URLs before fetching skill assets', async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        headers: { 'content-type': 'image/png' },
      }),
    )
    global.fetch = fetch as typeof fetch
    const service = new ArtifactStateMetaIntegrationsGithubTeamBrainService()
    const target = makeTarget()
    const handlers = service.getHandlers(target)

    const result = await handlers.upload_skill_asset(
      {
        agent_key: 'designer',
        skill_key: 'brand_visual_reference',
        image_url: 'http://127.0.0.1/admin.png',
      },
      'session-1',
    )

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.stringMatching(/blocked private/i),
      }),
    )
    expect(fetch).not.toHaveBeenCalled()
    expect(target.storageBucket.upload).not.toHaveBeenCalled()
  })

  it('blocks redirects to private network hosts when uploading skill assets', async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: 'http://169.254.169.254/latest/meta-data/' },
      }),
    )
    global.fetch = fetch as typeof fetch
    const service = new ArtifactStateMetaIntegrationsGithubTeamBrainService()
    const target = makeTarget()
    const handlers = service.getHandlers(target)

    const result = await handlers.upload_skill_asset(
      {
        agent_key: 'designer',
        skill_key: 'brand_visual_reference',
        image_url: 'https://cdn.example.com/redirect.png',
      },
      'session-1',
    )

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.stringMatching(/blocked private/i),
      }),
    )
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(target.storageBucket.upload).not.toHaveBeenCalled()
  })

  it('rejects non-image skill asset responses', async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response('<html></html>', {
        headers: { 'content-type': 'text/html' },
      }),
    )
    global.fetch = fetch as typeof fetch
    const service = new ArtifactStateMetaIntegrationsGithubTeamBrainService()
    const target = makeTarget()
    const handlers = service.getHandlers(target)

    const result = await handlers.upload_skill_asset(
      {
        agent_key: 'designer',
        skill_key: 'brand_visual_reference',
        image_url: 'https://cdn.example.com/not-image',
      },
      'session-1',
    )

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.stringMatching(/not an image/i),
      }),
    )
    expect(target.storageBucket.upload).not.toHaveBeenCalled()
  })

  it('rejects oversized skill asset responses before buffering', async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        headers: {
          'content-type': 'image/png',
          'content-length': String(11 * 1024 * 1024),
        },
      }),
    )
    global.fetch = fetch as typeof fetch
    const service = new ArtifactStateMetaIntegrationsGithubTeamBrainService()
    const target = makeTarget()
    const handlers = service.getHandlers(target)

    const result = await handlers.upload_skill_asset(
      {
        agent_key: 'designer',
        skill_key: 'brand_visual_reference',
        image_url: 'https://cdn.example.com/huge.png',
      },
      'session-1',
    )

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.stringMatching(/too large/i),
      }),
    )
    expect(target.storageBucket.upload).not.toHaveBeenCalled()
  })

  it('still uploads a valid public image skill asset', async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([137, 80, 78, 71]), {
        headers: {
          'content-type': 'image/png',
          'content-length': '4',
        },
      }),
    )
    global.fetch = fetch as typeof fetch
    const service = new ArtifactStateMetaIntegrationsGithubTeamBrainService()
    const target = makeTarget()
    const handlers = service.getHandlers(target)

    const result = await handlers.upload_skill_asset(
      {
        agent_key: 'designer',
        skill_key: 'brand_visual_reference',
        image_url: 'https://cdn.example.com/hero.png',
        description: 'hero.png',
      },
      'session-1',
    )

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        url: 'https://cdn.example.com/a.png',
      }),
    )
    expect(target.storageBucket.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^user-1\/designer\/brand_visual_reference\/.+\.png$/),
      expect.any(Buffer),
      { contentType: 'image/png', upsert: false },
    )
    expect(target.mainApiCall).toHaveBeenCalledWith(
      'POST',
      '/api/agents/designer/skills/brand_visual_reference/resources',
      'session-1',
      expect.objectContaining({
        file_path: 'assets/hero.png',
        content_type: 'image/png',
        storage_url: 'https://cdn.example.com/a.png',
      }),
    )
  })
})
