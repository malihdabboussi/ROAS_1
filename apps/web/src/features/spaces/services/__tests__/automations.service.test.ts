import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendGet, backendPost } from '@/lib/api/backend-client'
import {
  fetchAutomationRuns,
  fetchAutomationTemplates,
  installAutomationTemplate,
} from '../automations.service'

vi.mock('@/lib/api/backend-client', () => ({
  backendDelete: vi.fn(),
  backendGet: vi.fn(),
  backendPatch: vi.fn(),
  backendPost: vi.fn(),
}))

const backendGetMock = vi.mocked(backendGet)
const backendPostMock = vi.mocked(backendPost)

describe('automations service template API', () => {
  beforeEach(() => {
    backendGetMock.mockReset()
    backendPostMock.mockReset()
  })

  it('maps automation template API rows into flow template presets', async () => {
    backendGetMock.mockResolvedValue([
      {
        template_key: 'daily-digest',
        title: 'Daily digest',
        description: 'Send a daily digest',
        badge: 'Popular',
        featured: false,
        is_new: true,
        workflows: ['sales'],
        integration: null,
        trigger_group: 'tasks',
      },
    ])

    await expect(fetchAutomationTemplates('space-1')).resolves.toEqual([
      {
        id: 'daily-digest',
        title: 'Daily digest',
        description: 'Send a daily digest',
        badge: 'Popular',
        featured: undefined,
        isNew: true,
        workflows: ['sales'],
        integration: undefined,
        triggerGroup: 'tasks',
      },
    ])
    expect(backendGetMock).toHaveBeenCalledWith('/api/spaces/space-1/automations/templates')
  })

  it('fetches the org template catalog when no space is selected', async () => {
    backendGetMock.mockResolvedValue([])

    await expect(fetchAutomationTemplates(null)).resolves.toEqual([])
    expect(backendGetMock).toHaveBeenCalledWith('/api/automations/templates')
  })

  it('installs a template with an encoded template key', async () => {
    backendPostMock.mockResolvedValue({ id: 'automation-1' })

    await expect(installAutomationTemplate('space-1', 'daily/digest')).resolves.toEqual({
      id: 'automation-1',
    })
    expect(backendPostMock).toHaveBeenCalledWith(
      '/api/spaces/space-1/automations/templates/daily%2Fdigest/install',
      {},
    )
  })

  it('fetches automation run history for a space', async () => {
    backendGetMock.mockResolvedValue([{ id: 'run-1', status: 'success' }])

    await expect(fetchAutomationRuns('space-1')).resolves.toEqual([
      { id: 'run-1', status: 'success' },
    ])
    expect(backendGetMock).toHaveBeenCalledWith('/api/spaces/space-1/automations/runs')
  })

  it('fetches automation run history for a campaign scope', async () => {
    backendGetMock.mockResolvedValue([{ id: 'run-1', status: 'success' }])

    await expect(fetchAutomationRuns({ campaignId: 'campaign-1', spaceId: null })).resolves.toEqual(
      [{ id: 'run-1', status: 'success' }],
    )
    expect(backendGetMock).toHaveBeenCalledWith('/api/automations/runs?campaign_id=campaign-1')
  })
})
