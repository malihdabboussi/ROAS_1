import { describe, expect, it, vi } from 'vitest'
import { IntegrationsCoreService } from '../integrations-core.service'

function makeService(toolResponse: Record<string, unknown>) {
  const composio = {
    executeTool: vi.fn(async () => toolResponse),
  }
  const service = new IntegrationsCoreService(
    {} as never,
    composio as never,
    {} as never,
    undefined,
  )
  return { service, composio }
}

describe('IntegrationsCoreService', () => {
  it('maps common Composio toolkit slugs to integration ids', () => {
    const { service } = makeService({})

    expect(service.mapComposioToolkitToIntegrationId('google-drive')).toBe('google_drive')
    expect(service.mapComposioToolkitToIntegrationId('google_docs')).toBe('google_docs')
    expect(service.mapComposioToolkitToIntegrationId('active-campaign')).toBe('active_campaign')
    expect(service.mapComposioToolkitToIntegrationId('airtable')).toBe('airtable')
    expect(service.mapComposioToolkitToIntegrationId('unknown')).toBeNull()
  })

  it('resolves a Gmail connection identity through the configured Composio tool', async () => {
    const { service, composio } = makeService({
      data: { response_data: { emailAddress: 'person@example.com' } },
    })

    await expect(service.resolveConnectionIdentity('gmail', 'user-1', 'ca-1')).resolves.toBe(
      'person@example.com',
    )
    expect(composio.executeTool).toHaveBeenCalledWith('GMAIL_GET_PROFILE', 'user-1', {}, 'ca-1')
  })

  it('resolves Google Calendar identity from LIST_CALENDARS (not Gmail profile)', async () => {
    const { service, composio } = makeService({
      data: {
        dataOwner: 'dylanvanas@gmail.com',
        items: [{ id: 'dylanvanas@gmail.com', primary: true }],
      },
    })

    await expect(
      service.resolveConnectionIdentity('google_calendar', 'user-1', 'ca-1'),
    ).resolves.toBe('dylanvanas@gmail.com')
    expect(composio.executeTool).toHaveBeenCalledWith(
      'GOOGLECALENDAR_LIST_CALENDARS',
      'user-1',
      {},
      'ca-1',
    )
  })

  it('resolves an Airtable connection identity through the configured Composio tool', async () => {
    const { service, composio } = makeService({
      data: { response_data: { email: 'airtable-user@example.com' } },
    })

    await expect(service.resolveConnectionIdentity('airtable', 'user-1', 'ca-1')).resolves.toBe(
      'airtable-user@example.com',
    )
    expect(composio.executeTool).toHaveBeenCalledWith(
      'AIRTABLE_GET_USER_INFO',
      'user-1',
      {},
      'ca-1',
    )
  })
})
