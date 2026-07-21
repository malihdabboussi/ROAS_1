import { describe, expect, it, vi } from 'vitest'
import { ArtifactCalendarService } from './artifact-calendar.service'

describe('ArtifactCalendarService workspace actions', () => {
  it('routes get_person_agenda to Workspace agenda API', async () => {
    const target = { mainApiCall: vi.fn().mockResolvedValue({ success: true }) }
    const service = new ArtifactCalendarService()
    await service.getHandlers(target).get_person_agenda(
      {
        email: 'alex@company.com',
        start: '2026-06-18T00:00:00.000Z',
        end: '2026-06-19T00:00:00.000Z',
      },
      'session',
    )
    expect(target.mainApiCall).toHaveBeenCalledWith(
      'GET',
      '/api/integrations/google-workspace/agenda?start=2026-06-18T00%3A00%3A00.000Z&end=2026-06-19T00%3A00%3A00.000Z&email=alex%40company.com',
      'session',
    )
  })

  it('routes get_person_briefing to Workspace briefing API', async () => {
    const target = { mainApiCall: vi.fn().mockResolvedValue({ success: true }) }
    const service = new ArtifactCalendarService()
    await service.getHandlers(target).get_person_briefing(
      {
        person_id: '11111111-1111-1111-1111-111111111111',
        start: '2026-06-18T00:00:00.000Z',
        end: '2026-06-19T00:00:00.000Z',
      },
      'session',
    )
    expect(target.mainApiCall).toHaveBeenCalledWith(
      'GET',
      expect.stringContaining('/api/integrations/google-workspace/person-briefing?'),
      'session',
    )
  })
})
