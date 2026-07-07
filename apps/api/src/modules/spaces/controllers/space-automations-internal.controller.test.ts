import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SpaceAutomationInternalService } from '../services/space-automation-internal.service'
import { SpaceAutomationsInternalController } from './space-automations-internal.controller'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}))

function createQuery(result: Record<string, unknown> = { data: null, error: null }) {
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
  return query
}

function createSupabase(query: Record<string, any>) {
  return {
    from: vi.fn(() => query),
  }
}

function createController() {
  const automationService = {
    resumeAutomation: vi.fn().mockResolvedValue(undefined),
  }
  const configService = {
    get: vi.fn((key: string) => {
      if (key === 'INTERNAL_API_TOKEN') return 'internal-token'
      if (key === 'SUPABASE_URL') return 'https://supabase.example.com'
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'service-role'
      return undefined
    }),
  }
  return {
    controller: new SpaceAutomationsInternalController(
      new SpaceAutomationInternalService(automationService as never, configService as never),
      configService as never,
    ),
    automationService,
    configService,
  }
}

describe('SpaceAutomationsInternalController', () => {
  beforeEach(() => {
    mocks.createClient.mockReset()
  })

  it('rejects invalid internal tokens before creating a service client', async () => {
    const { controller, automationService } = createController()

    await expect(
      controller.resume('space-1', 'wrong-token', {
        run_state_id: 'run-state-1',
        task_status: 'done',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException)

    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(automationService.resumeAutomation).not.toHaveBeenCalled()
  })

  it('rejects missing run state or task status before creating a service client', async () => {
    const { controller, automationService } = createController()

    await expect(
      controller.resume('space-1', 'internal-token', {
        run_state_id: '',
        task_status: 'done',
      }),
    ).rejects.toBeInstanceOf(BadRequestException)

    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(automationService.resumeAutomation).not.toHaveBeenCalled()
  })

  it('rejects missing paused run state rows', async () => {
    const runStateQuery = createQuery({ data: null, error: null })
    const supabase = createSupabase(runStateQuery)
    mocks.createClient.mockReturnValue(supabase)
    const { controller, automationService } = createController()

    await expect(
      controller.resume('space-1', 'internal-token', {
        run_state_id: 'run-state-1',
        task_status: 'done',
      }),
    ).rejects.toBeInstanceOf(BadRequestException)

    expect(mocks.createClient).toHaveBeenCalledWith('https://supabase.example.com', 'service-role')
    expect(runStateQuery.select).toHaveBeenCalledWith('user_id, org_id, item_id')
    expect(runStateQuery.eq).toHaveBeenCalledWith('id', 'run-state-1')
    expect(runStateQuery.eq).toHaveBeenCalledWith('status', 'paused')
    expect(automationService.resumeAutomation).not.toHaveBeenCalled()
  })

  it('dispatches resume automation with the paused run context', async () => {
    const runState = { user_id: 'user-1', org_id: 'org-1', item_id: 'item-1' }
    const runStateQuery = createQuery({ data: runState, error: null })
    const supabase = createSupabase(runStateQuery)
    mocks.createClient.mockReturnValue(supabase)
    const { controller, automationService } = createController()

    await expect(
      controller.resume('space-1', 'internal-token', {
        run_state_id: 'run-state-1',
        task_status: 'done',
      }),
    ).resolves.toEqual({ accepted: true })

    expect(automationService.resumeAutomation).toHaveBeenCalledWith(
      {
        supabase,
        userId: 'user-1',
        orgId: 'org-1',
        spaceId: 'space-1',
        itemId: 'item-1',
        depth: 0,
      },
      'run-state-1',
      'done',
    )
  })
})
