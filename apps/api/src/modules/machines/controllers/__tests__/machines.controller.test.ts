import { ForbiddenException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { MachinesRepository } from '../../repositories/machines.repository'
import { MachineProvisionAccessService } from '../../services/machine-provision-access.service'
import { MachinesController } from '../machines.controller'

function makeController() {
  const machinesService = {
    provision: vi.fn().mockResolvedValue({ status: 'running' }),
    ensureRunning: vi.fn().mockResolvedValue({ status: 'running' }),
  }
  const serviceClient = mockServiceClient({})
  const repository = new MachinesRepository(serviceClient as never)
  const provisionAccess = new MachineProvisionAccessService(repository)
  const controller = new MachinesController(
    machinesService as never,
    {} as never,
    {} as never,
    {} as never,
    provisionAccess,
  )
  return { controller, machinesService, serviceClient }
}

function mockServiceClient(input: {
  inviteCode?: {
    id: string
    max_uses: number | null
    uses_count: number
    expires_at: string | null
  } | null
  freePlan?: { id: string } | null
}) {
  const directInviteChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: input.inviteCode ?? null, error: null }),
  }
  const planChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi
      .fn()
      .mockResolvedValue({ data: input.freePlan ?? { id: 'free-plan' }, error: null }),
  }
  const subscriptionChain = {
    upsert: vi.fn().mockReturnThis(),
  }
  const client = {
    from: vi.fn((table: string) => {
      if (table === 'direct_invite_codes') return directInviteChain
      if (table === 'subscription_plans') return planChain
      if (table === 'user_subscriptions') return subscriptionChain
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
    }),
  }
  return { client, directInviteChain, planChain, subscriptionChain }
}

function mockSupabase(input: {
  activeSub?: { id: string } | null
  orgMemberships?: Array<{ id: string; role: string }>
}) {
  return {
    from: vi.fn((table: string) => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        maybeSingle: vi
          .fn()
          .mockResolvedValue(
            table === 'user_subscriptions'
              ? { data: input.activeSub ?? null, error: null }
              : { data: input.orgMemberships?.[0] ?? null, error: null },
          ),
      }
      return chain
    }),
  }
}

describe('MachinesController runtime eligibility', () => {
  it('rejects machine provisioning for viewer-only org access', async () => {
    const { controller, machinesService } = makeController()
    const supabase = mockSupabase({
      activeSub: null,
      orgMemberships: [{ id: 'member-1', role: 'viewer' }],
    })

    await expect(
      controller.provision(
        { id: 'user-1' },
        supabase as never,
        { userId: 'user-1', orgId: 'org-1', orgRole: 'viewer' },
        undefined,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException)
    expect(machinesService.provision).not.toHaveBeenCalled()
  })

  it('allows machine provisioning for editor org access', async () => {
    const { controller, machinesService } = makeController()
    const supabase = mockSupabase({
      activeSub: null,
      orgMemberships: [{ id: 'member-1', role: 'editor' }],
    })

    await expect(
      controller.provision(
        { id: 'user-1' },
        supabase as never,
        { userId: 'user-1', orgId: 'org-1', orgRole: 'editor' },
        undefined,
      ),
    ).resolves.toEqual({ status: 'running' })
    expect(machinesService.provision).toHaveBeenCalledWith(supabase, 'user-1')
  })

  it('rejects ensure-running for viewer-only org access', async () => {
    const { controller, machinesService } = makeController()
    const supabase = mockSupabase({
      activeSub: null,
      orgMemberships: [{ id: 'member-1', role: 'viewer' }],
    })

    await expect(
      controller.ensureRunning({ id: 'user-1' }, supabase as never, {
        userId: 'user-1',
        orgId: 'org-1',
        orgRole: 'viewer',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException)
    expect(machinesService.ensureRunning).not.toHaveBeenCalled()
  })

  it('passes chat runtime requirement into ensure-running', async () => {
    const { controller, machinesService } = makeController()
    const supabase = mockSupabase({
      activeSub: { id: 'sub-1' },
      orgMemberships: [],
    })

    await expect(
      controller.ensureRunning(
        { id: 'user-1' },
        supabase as never,
        {
          userId: 'user-1',
          orgId: 'org-1',
          orgRole: 'viewer',
        },
        { required_runtime: 'chat' },
      ),
    ).resolves.toEqual({ status: 'running' })

    expect(machinesService.ensureRunning).toHaveBeenCalledWith(supabase, 'user-1', {
      requiredRuntime: 'chat',
    })
  })

  it('allows provisioning with a valid direct invite that has no expiry', async () => {
    const machinesService = {
      provision: vi.fn().mockResolvedValue({ status: 'running' }),
      ensureRunning: vi.fn().mockResolvedValue({ status: 'running' }),
    }
    const serviceClient = mockServiceClient({
      inviteCode: { id: 'invite-1', max_uses: null, uses_count: 0, expires_at: null },
      freePlan: { id: 'free-plan' },
    })
    const repository = new MachinesRepository(serviceClient as never)
    const provisionAccess = new MachineProvisionAccessService(repository)
    const controller = new MachinesController(
      machinesService as never,
      {} as never,
      {} as never,
      {} as never,
      provisionAccess,
    )
    const supabase = mockSupabase({ activeSub: null, orgMemberships: [] })

    await expect(
      controller.provision(
        { id: 'user-1' },
        supabase as never,
        { userId: 'user-1', orgId: null, orgRole: null },
        { invite_code: 'CODE-1' },
      ),
    ).resolves.toEqual({ status: 'running' })

    expect(serviceClient.subscriptionChain.upsert).toHaveBeenCalledWith(
      { user_id: 'user-1', plan_id: 'free-plan', status: 'active' },
      { onConflict: 'user_id' },
    )
    expect(serviceClient.directInviteChain.update).toHaveBeenCalledWith({ uses_count: 1 })
    expect(machinesService.provision).toHaveBeenCalledWith(supabase, 'user-1')
  })

  it('rejects expired direct invites', async () => {
    const machinesService = {
      provision: vi.fn().mockResolvedValue({ status: 'running' }),
      ensureRunning: vi.fn().mockResolvedValue({ status: 'running' }),
    }
    const serviceClient = mockServiceClient({
      inviteCode: {
        id: 'invite-1',
        max_uses: null,
        uses_count: 0,
        expires_at: '2020-01-01T00:00:00.000Z',
      },
    })
    const repository = new MachinesRepository(serviceClient as never)
    const provisionAccess = new MachineProvisionAccessService(repository)
    const controller = new MachinesController(
      machinesService as never,
      {} as never,
      {} as never,
      {} as never,
      provisionAccess,
    )
    const supabase = mockSupabase({ activeSub: null, orgMemberships: [] })

    await expect(
      controller.provision(
        { id: 'user-1' },
        supabase as never,
        { userId: 'user-1', orgId: null, orgRole: null },
        { invite_code: 'CODE-1' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException)
    expect(machinesService.provision).not.toHaveBeenCalled()
  })

  it('rejects direct invites that reached max uses', async () => {
    const machinesService = {
      provision: vi.fn().mockResolvedValue({ status: 'running' }),
      ensureRunning: vi.fn().mockResolvedValue({ status: 'running' }),
    }
    const serviceClient = mockServiceClient({
      inviteCode: { id: 'invite-1', max_uses: 1, uses_count: 1, expires_at: null },
    })
    const repository = new MachinesRepository(serviceClient as never)
    const provisionAccess = new MachineProvisionAccessService(repository)
    const controller = new MachinesController(
      machinesService as never,
      {} as never,
      {} as never,
      {} as never,
      provisionAccess,
    )
    const supabase = mockSupabase({ activeSub: null, orgMemberships: [] })

    await expect(
      controller.provision(
        { id: 'user-1' },
        supabase as never,
        { userId: 'user-1', orgId: null, orgRole: null },
        { invite_code: 'CODE-1' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException)
    expect(machinesService.provision).not.toHaveBeenCalled()
  })
})
