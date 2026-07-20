import { BadRequestException, ConflictException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { SlackPeopleService } from './slack-people.service'

function createService(overrides?: {
  integration?: { access_token?: string } | null
  people?: Array<Record<string, unknown>>
}) {
  const people = overrides?.people ?? []
  const repository = {
    findOrgSlackIntegration: vi
      .fn()
      .mockResolvedValue(
        overrides && 'integration' in overrides
          ? overrides.integration
            ? { user_id: 'owner-1', access_token: overrides.integration.access_token }
            : null
          : { user_id: 'owner-1', access_token: 'xoxb' },
      ),
    listPeople: vi.fn().mockResolvedValue(people),
    updateDeliveryMode: vi.fn().mockResolvedValue({ id: 'person-1', delivery_mode: 'active' }),
    updateRelationshipKind: vi.fn().mockResolvedValue({
      id: 'person-1',
      relationship_kind: 'internal',
      relationship_source: 'manual',
    }),
    confirmSuggestedIdentity: vi.fn().mockResolvedValue({
      id: 'person-1',
      vibey_user_id: 'user-1',
      suggested_vibey_user_id: null,
      identity_match_method: 'confirmed_name',
    }),
    listShadowActions: vi.fn().mockResolvedValue([]),
    listDefaultUserBrains: vi
      .fn()
      .mockResolvedValue([{ id: 'brain-1', owner_id: 'user-1', name: 'Default Brain' }]),
    listPersonShadowActions: vi
      .fn()
      .mockResolvedValue([{ id: 'action-1', target_member_id: 'person-1', status: 'sent' }]),
    findPerson: vi.fn().mockResolvedValue({
      id: 'person-1',
      platform_id: 'U1',
      delivery_mode: 'shadow',
    }),
    createShadowAction: vi.fn().mockResolvedValue({ id: 'action-1', status: 'proposed' }),
    findShadowAction: vi.fn().mockResolvedValue({
      id: 'action-1',
      status: 'approved',
      proposed_content: 'Quick check-in — anything blocking you today?',
      target_member_id: 'person-1',
      target: { platform_id: 'U1', delivery_mode: 'active' },
    }),
    reviewShadowAction: vi.fn().mockResolvedValue({ id: 'action-1', status: 'approved' }),
    claimShadowActionForSend: vi.fn().mockResolvedValue({ id: 'action-1', status: 'sending' }),
    markShadowActionSent: vi.fn().mockResolvedValue({ id: 'action-1', status: 'sent' }),
    markShadowActionFailed: vi.fn().mockResolvedValue({ id: 'action-1', status: 'failed' }),
  }
  const senderResolver = {
    seedContactIdentifiersFromWorkspace: vi.fn().mockResolvedValue({ seeded: 0, members: [] }),
  }
  const slackApi = {
    openDmChannel: vi.fn().mockResolvedValue('D1'),
    getChannelHistory: vi.fn().mockResolvedValue([
      { user: 'U1', text: 'I need help with launch reporting.', ts: '123.400' },
      { bot_id: 'B1', text: 'I can pull that together.', ts: '123.500' },
    ]),
    postMessage: vi.fn().mockResolvedValue({ ok: true, ts: '123.456' }),
  }
  const service = new SlackPeopleService(
    repository as never,
    senderResolver as never,
    slackApi as never,
  )
  return { service, repository, senderResolver, slackApi }
}

describe('SlackPeopleService', () => {
  it('refreshes Slack identities before returning the durable people directory', async () => {
    const person = {
      id: 'person-1',
      display_name: 'Ada',
      relationship_kind: 'team_member',
      delivery_mode: 'shadow',
    }
    const { service, repository, senderResolver } = createService({ people: [person] })

    const result = await service.listPeople({} as never, 'org-1')

    expect(senderResolver.seedContactIdentifiersFromWorkspace).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: 'owner-1', orgId: 'org-1' }),
    )
    expect(repository.listPeople).toHaveBeenCalledWith(expect.anything(), 'org-1')
    expect(result).toEqual({
      connected: true,
      people: [{ ...person, brain_id: null, brain_name: null }],
    })
  })

  it('attaches an accessible canonical User Brain to a linked portal person', async () => {
    const { service } = createService({
      people: [
        {
          id: 'person-1',
          display_name: 'Ada',
          vibey_user_id: 'user-1',
          relationship_kind: 'internal',
          delivery_mode: 'shadow',
        },
      ],
    })

    await expect(service.listPeople({} as never, 'org-1')).resolves.toEqual({
      connected: true,
      people: [
        expect.objectContaining({
          id: 'person-1',
          brain_id: 'brain-1',
          brain_name: 'Default Brain',
        }),
      ],
    })
  })

  it('returns an empty disconnected directory without calling Slack', async () => {
    const { service, senderResolver } = createService({ integration: null })

    await expect(service.listPeople({} as never, 'org-1')).resolves.toEqual({
      connected: false,
      people: [],
    })
    expect(senderResolver.seedContactIdentifiersFromWorkspace).not.toHaveBeenCalled()
  })

  it('requires organization context before changing delivery mode', async () => {
    const { service } = createService()

    await expect(
      service.updateDeliveryMode({} as never, null, 'person-1', 'active'),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('lets an admin classify a person as internal, external, or ignored', async () => {
    const { service, repository } = createService()

    await service.updateRelationshipKind({} as never, 'org-1', 'person-1', 'internal')

    expect(repository.updateRelationshipKind).toHaveBeenCalledWith(expect.anything(), {
      id: 'person-1',
      orgId: 'org-1',
      relationshipKind: 'internal',
    })
  })

  it('requires explicit confirmation before applying a name-only identity suggestion', async () => {
    const { service, repository } = createService()

    await service.confirmSuggestedIdentity({} as never, 'org-1', 'person-1')

    expect(repository.confirmSuggestedIdentity).toHaveBeenCalledWith(
      expect.anything(),
      'org-1',
      'person-1',
    )
  })

  it('returns live Slack DM messages and Shadow actions for one person', async () => {
    const { service, slackApi } = createService()

    await expect(service.getPersonActivity({} as never, 'org-1', 'person-1')).resolves.toEqual({
      channel_id: 'D1',
      messages: [
        expect.objectContaining({ direction: 'outbound', text: 'I can pull that together.' }),
        expect.objectContaining({
          direction: 'inbound',
          text: 'I need help with launch reporting.',
        }),
      ],
      actions: [{ id: 'action-1', target_member_id: 'person-1', status: 'sent' }],
    })
    expect(slackApi.getChannelHistory).toHaveBeenCalledWith('xoxb', 'D1', 100)
  })

  it('creates a harmless test proposal without sending it', async () => {
    const { service, repository, slackApi } = createService()

    await expect(
      service.createTestProposal({} as never, 'admin-1', 'org-1', 'person-1'),
    ).resolves.toEqual({ action: { id: 'action-1', status: 'proposed' } })
    expect(repository.createShadowAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        orgId: 'org-1',
        userId: 'admin-1',
        targetMemberId: 'person-1',
        actionKind: 'message',
      }),
    )
    expect(slackApi.postMessage).not.toHaveBeenCalled()
  })

  it('rejects a test proposal when the person is off', async () => {
    const { service, repository } = createService()
    repository.findPerson.mockResolvedValue({
      id: 'person-1',
      platform_id: 'U1',
      delivery_mode: 'off',
    })

    await expect(
      service.createTestProposal({} as never, 'admin-1', 'org-1', 'person-1'),
    ).rejects.toBeInstanceOf(ConflictException)
  })

  it('sends only an approved proposal for an active person', async () => {
    const { service, repository, slackApi } = createService()

    const result = await service.sendShadowAction({} as never, 'admin-1', 'org-1', 'action-1')

    expect(slackApi.openDmChannel).toHaveBeenCalledWith('xoxb', 'U1')
    expect(slackApi.postMessage).toHaveBeenCalledWith(
      'xoxb',
      'D1',
      'Quick check-in — anything blocking you today?',
    )
    expect(repository.markShadowActionSent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ actionId: 'action-1', sentBy: 'admin-1', slackTs: '123.456' }),
    )
    expect(result).toEqual({ action: { id: 'action-1', status: 'sent' } })
  })

  it('records the administrator who approves a proposed action', async () => {
    const { service, repository } = createService()

    await expect(
      service.reviewShadowAction({} as never, 'admin-1', 'org-1', 'action-1', 'approved'),
    ).resolves.toEqual({ action: { id: 'action-1', status: 'approved' } })
    expect(repository.reviewShadowAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        actionId: 'action-1',
        orgId: 'org-1',
        reviewedBy: 'admin-1',
        status: 'approved',
      }),
    )
  })

  it('does not send when the person is still in Shadow', async () => {
    const { service, repository, slackApi } = createService()
    repository.findShadowAction.mockResolvedValue({
      id: 'action-1',
      status: 'approved',
      proposed_content: 'Hello',
      target: { platform_id: 'U1', delivery_mode: 'shadow' },
    })

    await expect(
      service.sendShadowAction({} as never, 'admin-1', 'org-1', 'action-1'),
    ).rejects.toBeInstanceOf(ConflictException)
    expect(slackApi.postMessage).not.toHaveBeenCalled()
  })

  it('does not send when another request already claimed the approved proposal', async () => {
    const { service, repository, slackApi } = createService()
    repository.claimShadowActionForSend.mockResolvedValue(null)

    await expect(
      service.sendShadowAction({} as never, 'admin-1', 'org-1', 'action-1'),
    ).rejects.toBeInstanceOf(ConflictException)
    expect(slackApi.openDmChannel).not.toHaveBeenCalled()
    expect(slackApi.postMessage).not.toHaveBeenCalled()
  })

  it('records a failed claim when Slack rejects the outbound message', async () => {
    const { service, repository, slackApi } = createService()
    slackApi.postMessage.mockRejectedValue(new Error('Slack unavailable'))

    await expect(
      service.sendShadowAction({} as never, 'admin-1', 'org-1', 'action-1'),
    ).rejects.toThrow('Slack unavailable')
    expect(repository.markShadowActionFailed).toHaveBeenCalledWith(
      expect.anything(),
      'org-1',
      'action-1',
    )
  })
})
