import { describe, expect, it, vi } from 'vitest'
import { OrgInvitationService } from '../org-invitation.service'

function makeService() {
  const repo = {
    findInvitationByToken: vi.fn(),
    findMember: vi.fn(),
    findProfileBootstrapState: vi.fn(),
    findActiveSubscription: vi.fn(),
    findUserByEmail: vi.fn(),
    findPendingInvitationByEmail: vi.fn(),
    createInvitation: vi.fn(),
    addMember: vi.fn(),
    markProfileOrgOnly: vi.fn(),
    ensureDefaultBrain: vi.fn(),
    updateInvitationStatus: vi.fn(),
  }
  const logger = { logError: vi.fn() }
  const sendgrid = { sendEmail: vi.fn() }
  const configService = { get: vi.fn() }
  const serviceClient = { from: vi.fn() }
  const svc = { client: serviceClient }
  const machinesService = { provision: vi.fn() }
  const gatewayService = { triggerFullSync: vi.fn().mockResolvedValue(undefined) }
  const deliveryRepository = {
    findPlatformEmailConfig: vi.fn(),
    findOrgName: vi.fn(),
    findInviterName: vi.fn(),
    insertInvitationNotification: vi.fn(),
  }
  const service = new OrgInvitationService(
    repo as never,
    logger as never,
    sendgrid as never,
    configService as never,
    svc as never,
    machinesService as never,
    gatewayService as never,
    deliveryRepository as never,
  )
  return {
    service,
    repo,
    logger,
    sendgrid,
    configService,
    serviceClient,
    machinesService,
    gatewayService,
    deliveryRepository,
  }
}

function pendingInvitation(role: 'viewer' | 'editor') {
  return {
    id: 'invite-1',
    org_id: 'org-1',
    email: 'person@example.com',
    role,
    invited_by: 'admin-1',
    expires_at: new Date(Date.now() + 60_000).toISOString(),
  }
}

describe('OrgInvitationService.acceptInvitationAndBootstrap', () => {
  it('accepts a viewer invite without provisioning a machine', async () => {
    const { service, repo, machinesService } = makeService()
    repo.findInvitationByToken.mockResolvedValue(pendingInvitation('viewer'))
    repo.findMember.mockResolvedValue(null)
    repo.findProfileBootstrapState.mockResolvedValue({
      onboarding_completed: false,
      fly_machine_id: null,
    })
    repo.findActiveSubscription.mockResolvedValue(null)
    repo.addMember.mockResolvedValue({ id: 'member-1' })
    repo.ensureDefaultBrain.mockResolvedValue('brain-1')

    await expect(
      service.acceptInvitationAndBootstrap({} as never, 'token-1', 'user-1', 'person@example.com'),
    ).resolves.toEqual({
      org_id: 'org-1',
      role: 'viewer',
      requires_machine_setup: false,
    })

    expect(repo.addMember).toHaveBeenCalledWith(
      expect.anything(),
      'org-1',
      'user-1',
      'viewer',
      'admin-1',
    )
    expect(repo.markProfileOrgOnly).toHaveBeenCalledWith(expect.anything(), 'user-1', 'org-1')
    expect(repo.ensureDefaultBrain).toHaveBeenCalledWith(expect.anything(), 'user-1')
    expect(machinesService.provision).not.toHaveBeenCalled()
  })

  it('keeps provisioning for editor invites', async () => {
    const { service, repo, machinesService } = makeService()
    repo.findInvitationByToken.mockResolvedValue(pendingInvitation('editor'))
    repo.findMember.mockResolvedValue(null)
    repo.findProfileBootstrapState.mockResolvedValue({
      onboarding_completed: false,
      fly_machine_id: null,
    })
    repo.findActiveSubscription.mockResolvedValue(null)
    repo.addMember.mockResolvedValue({ id: 'member-1' })
    repo.ensureDefaultBrain.mockResolvedValue('brain-1')
    machinesService.provision.mockResolvedValue({ status: 'running' })

    await expect(
      service.acceptInvitationAndBootstrap({} as never, 'token-1', 'user-1', 'person@example.com'),
    ).resolves.toEqual({
      org_id: 'org-1',
      role: 'editor',
      requires_machine_setup: true,
    })

    expect(machinesService.provision).toHaveBeenCalledWith(expect.anything(), 'user-1')
    expect(repo.ensureDefaultBrain).toHaveBeenCalledWith(expect.anything(), 'user-1')
  })
})

describe('OrgInvitationService.inviteMember', () => {
  it('creates the invitation, sends email, and inserts an in-app notification for known users', async () => {
    const { service, repo, sendgrid, configService, serviceClient, deliveryRepository } =
      makeService()
    repo.findUserByEmail
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'invited-user-1' })
    repo.findPendingInvitationByEmail.mockResolvedValue(null)
    deliveryRepository.findPlatformEmailConfig.mockResolvedValue({
      sender_email: 'noreply@vibey.ai',
      sender_name: 'Vibey',
      reply_to_email: 'reply@vibey.ai',
      sender_verified: true,
    })
    deliveryRepository.findOrgName.mockResolvedValue('Acme Team')
    deliveryRepository.findInviterName.mockResolvedValue('Alex Admin')
    deliveryRepository.insertInvitationNotification.mockResolvedValue(undefined)
    repo.createInvitation.mockImplementation(
      (
        _supabase,
        orgId: string,
        email: string,
        role: string,
        invitedBy: string,
        token: string,
        expiresAt: string,
      ) =>
        Promise.resolve({
          id: 'invite-1',
          org_id: orgId,
          email,
          role,
          invited_by: invitedBy,
          token,
          expires_at: expiresAt,
        }),
    )
    sendgrid.sendEmail.mockResolvedValue({ messageId: 'sg-1' })
    configService.get.mockReturnValue('https://app.vibey.ai')

    const invitation = await service.inviteMember(
      {} as never,
      'org-1',
      'person@example.com',
      'editor',
      'admin-1',
    )
    const token = repo.createInvitation.mock.calls[0][5]

    expect(invitation).toMatchObject({
      id: 'invite-1',
      org_id: 'org-1',
      email: 'person@example.com',
      role: 'editor',
      token,
    })
    expect(sendgrid.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: { email: 'person@example.com' },
        from: { email: 'noreply@vibey.ai', name: 'Vibey' },
        replyTo: { email: 'reply@vibey.ai' },
        subject: "You've been invited to join Acme Team on Vibey",
        text: expect.stringContaining(`https://app.vibey.ai/invite/${token}`),
      }),
    )

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(deliveryRepository.findPlatformEmailConfig).toHaveBeenCalledWith(serviceClient)
    expect(deliveryRepository.findOrgName).toHaveBeenCalledWith(serviceClient, 'org-1')
    expect(deliveryRepository.findInviterName).toHaveBeenCalledWith(serviceClient, 'admin-1')
    expect(deliveryRepository.insertInvitationNotification).toHaveBeenCalledWith(serviceClient, {
      userId: 'invited-user-1',
      token,
      orgName: 'Acme Team',
      inviterName: 'Alex Admin',
      roleLabel: 'Editor',
    })
  })
})
