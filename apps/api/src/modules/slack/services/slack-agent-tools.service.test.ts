import { describe, expect, it, vi } from 'vitest'
import { SlackAgentToolsService } from './slack-agent-tools.service'

describe('SlackAgentToolsService upload asset refs', () => {
  it('returns an external asset_ref for files uploaded to Slack', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: vi.fn(async () => Buffer.from('slack-file').buffer),
      }),
    )
    const slackApi = {
      uploadExternalFileToChannel: vi.fn().mockResolvedValue({ file_id: 'F123', permalink: 'https://slack.example/F123' }),
    }
    const slackRepo = {
      getIntegration: vi.fn().mockResolvedValue({ access_token: 'xoxb-token' }),
    }
    const service = new SlackAgentToolsService(slackApi as never, slackRepo as never)

    await expect(
      service.uploadFile({} as never, 'user-1', 'org-1', {
        channel_id: 'C123',
        file_url: 'https://cdn.example/report.pdf',
        filename: 'report.pdf',
      }),
    ).resolves.toMatchObject({
      success: true,
      asset_ref: {
        kind: 'external_asset',
        provider: 'slack',
        external_id: 'F123',
        name: 'report.pdf',
        url: 'https://slack.example/F123',
        org_id: 'org-1',
      },
    })
  })
})
