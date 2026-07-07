import { describe, expect, it } from 'vitest'
import { RequestContextService } from './services/request-context.service'

describe('RequestContextService active working set', () => {
  it('stores uploaded attachment descriptors and preserves them across context refreshes', () => {
    const service = new RequestContextService()
    service.set(
      'conversation-1',
      'user-1',
      'campaign-1',
      'access-token',
      null,
      null,
      null,
      'studio',
      null,
      null,
      'campaign',
      null,
      [
        {
          filename: 'screenshot.png',
          fileUrl: 'https://files.example/screenshot.png',
          mimeType: 'image/png',
          type: 'image',
          sizeBytes: 123,
        },
      ],
    )

    service.set(
      'conversation-1',
      'user-1',
      'campaign-1',
      'new-access-token',
      null,
      null,
      null,
      'studio',
      null,
      null,
      'campaign',
    )

    const attachments = service.getUploadedAttachments('conversation-1')
    attachments[0]!.filename = 'mutated.png'

    expect(service.getUploadedAttachments('conversation-1')).toEqual([
      {
        filename: 'screenshot.png',
        fileUrl: 'https://files.example/screenshot.png',
        mimeType: 'image/png',
        type: 'image',
        sizeBytes: 123,
      },
    ])
  })

  it('stores JSON-safe active artifacts and preserves them across context refreshes', () => {
    const service = new RequestContextService()
    service.set(
      'conversation-1',
      'user-1',
      'campaign-1',
      'access-token',
      null,
      null,
      null,
      'studio',
      null,
      null,
      'campaign',
    )

    service.setActiveArtifact('conversation-1', {
      type: 'presentation',
      id: 'deck-1',
      label: 'Launch Deck',
      campaign_id: 'campaign-1',
      source: 'user_attached',
      updated_at: 100,
    })

    service.set(
      'conversation-1',
      'user-1',
      'campaign-1',
      'new-access-token',
      null,
      null,
      null,
      'studio',
      null,
      null,
      'campaign',
    )

    expect(service.getActiveByType('conversation-1', 'presentation')).toEqual([
      {
        type: 'presentation',
        id: 'deck-1',
        label: 'Launch Deck',
        campaign_id: 'campaign-1',
        parent: null,
        source: 'user_attached',
        updated_at: 100,
      },
    ])
    expect(service.getLastTouched('conversation-1')).toEqual(
      expect.objectContaining({ type: 'presentation', id: 'deck-1' }),
    )
    expect(JSON.parse(JSON.stringify(service.getActiveWorkingSet('conversation-1')))).toEqual(
      service.getActiveWorkingSet('conversation-1'),
    )
  })

  it('deduplicates active artifacts by type and id with latest data winning', () => {
    const service = new RequestContextService()
    service.set(
      'conversation-1',
      'user-1',
      'campaign-1',
      'access-token',
      null,
      null,
      null,
      'studio',
      null,
      null,
      'campaign',
    )

    service.setActiveArtifact('conversation-1', {
      type: 'funnel_page',
      id: 'page-1',
      label: 'Old Name',
      campaign_id: 'campaign-1',
      parent: { type: 'funnel', id: 'funnel-1' },
      source: 'created_in_conversation',
      updated_at: 100,
    })
    service.setActiveArtifact('conversation-1', {
      type: 'funnel_page',
      id: 'page-1',
      label: 'New Name',
      campaign_id: 'campaign-1',
      parent: { type: 'funnel', id: 'funnel-1' },
      source: 'ui_selected',
      updated_at: 200,
    })

    expect(service.getActiveByType('conversation-1', 'funnel_page')).toEqual([
      expect.objectContaining({
        id: 'page-1',
        label: 'New Name',
        source: 'ui_selected',
        updated_at: 200,
      }),
    ])
  })

  it('preserves active flow build state across matching context refreshes', () => {
    const service = new RequestContextService()
    service.set(
      'conversation-1',
      'user-1',
      'campaign-1',
      'access-token',
      null,
      null,
      null,
      'studio',
      null,
      'space-1',
      'campaign',
    )

    service.setActiveFlowBuild('conversation-1', {
      sessionId: 'session-1',
      spaceId: 'space-1',
      mode: 'update',
      targetAutomationId: 'flow-1',
      updated_at: 100,
    })

    service.set(
      'conversation-1',
      'user-1',
      'campaign-1',
      'new-access-token',
      null,
      null,
      null,
      'studio',
      null,
      'space-1',
      'campaign',
    )

    expect(service.getActiveFlowBuild('conversation-1')).toEqual({
      sessionId: 'session-1',
      spaceId: 'space-1',
      mode: 'update',
      targetAutomationId: 'flow-1',
      updated_at: 100,
    })
  })

  it('clears active flow build state when Space scope changes', () => {
    const service = new RequestContextService()
    service.set(
      'conversation-1',
      'user-1',
      null,
      'access-token',
      null,
      null,
      null,
      'studio',
      null,
      'space-1',
      'personal',
    )
    service.setActiveFlowBuild('conversation-1', {
      sessionId: 'session-1',
      spaceId: 'space-1',
      mode: 'create',
    })

    service.set(
      'conversation-1',
      'user-1',
      null,
      'new-access-token',
      null,
      null,
      null,
      'studio',
      null,
      'space-2',
      'personal',
    )

    expect(service.getActiveFlowBuild('conversation-1')).toBeNull()
  })
})
