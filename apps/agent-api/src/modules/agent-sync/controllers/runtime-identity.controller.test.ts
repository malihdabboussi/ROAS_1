import type { ExecutionContext } from '@nestjs/common'
import { BadRequestException, UnauthorizedException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { ZodValidationPipe } from '@vibey/api-shared'
import {
  BindRuntimeIdentityBodySchema,
  ResetRuntimeIdentityBodySchema,
} from '../dtos/runtime-identity.dto'
import { RuntimeIdentityGuard } from '../guards/runtime-identity.guard'
import { RuntimeIdentityController } from './runtime-identity.controller'

const USER_ID = '19847dc5-a29a-4684-87d0-4cf6560baa10'

function makeContext(headers: Record<string, string | undefined>, method = 'POST') {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        method,
        headers,
      }),
    }),
  } as ExecutionContext
}

function makeController() {
  const syncService = {
    bindRuntimeIdentity: vi.fn().mockResolvedValue({
      ok: true,
      user_id: USER_ID,
      machine_id: 'machine-1',
      ready: true,
    }),
    resetRuntimeIdentity: vi.fn().mockResolvedValue({
      ok: true,
      machine_id: 'machine-1',
      ready: false,
    }),
  }
  const readinessService = {
    resetAll: vi.fn(),
  }
  const controller = new RuntimeIdentityController(syncService as never, readinessService as never)
  return { controller, syncService, readinessService }
}

describe('RuntimeIdentityGuard', () => {
  it('accepts x-internal-token and bearer token auth', () => {
    process.env.INTERNAL_API_TOKEN = 'secret'
    const guard = new RuntimeIdentityGuard()

    expect(guard.canActivate(makeContext({ 'x-internal-token': 'secret' }))).toBe(true)
    expect(guard.canActivate(makeContext({ authorization: 'Bearer secret' }))).toBe(true)
  })

  it('rejects missing or wrong internal tokens', () => {
    process.env.INTERNAL_API_TOKEN = 'secret'
    const guard = new RuntimeIdentityGuard()

    expect(() => guard.canActivate(makeContext({}))).toThrow(UnauthorizedException)
    expect(() => guard.canActivate(makeContext({ 'x-internal-token': 'wrong' }))).toThrow(
      UnauthorizedException,
    )
  })
})

describe('RuntimeIdentityController', () => {
  it('binds runtime identity through the sync service', async () => {
    const { controller, syncService } = makeController()

    await expect(controller.bind({ user_id: USER_ID, machine_id: 'machine-1' })).resolves.toEqual({
      ok: true,
      user_id: USER_ID,
      machine_id: 'machine-1',
      ready: true,
    })

    expect(syncService.bindRuntimeIdentity).toHaveBeenCalledWith({
      userId: USER_ID,
      machineId: 'machine-1',
    })
  })

  it('resets runtime identity and clears runtime readiness caches', async () => {
    const { controller, syncService, readinessService } = makeController()

    await expect(controller.reset({ machine_id: 'machine-1' })).resolves.toEqual({
      ok: true,
      machine_id: 'machine-1',
      ready: false,
    })

    expect(syncService.resetRuntimeIdentity).toHaveBeenCalledWith({ machineId: 'machine-1' })
    expect(readinessService.resetAll).toHaveBeenCalled()
  })

  it('rejects invalid bind and reset bodies before service mutation', () => {
    const { syncService } = makeController()
    const bindPipe = new ZodValidationPipe(BindRuntimeIdentityBodySchema)
    const resetPipe = new ZodValidationPipe(ResetRuntimeIdentityBodySchema)

    expect(() => bindPipe.transform({ user_id: 'not-a-uuid', machine_id: 'machine-1' })).toThrow(
      BadRequestException,
    )
    expect(() => resetPipe.transform({ machine_id: '' })).toThrow(BadRequestException)
    expect(syncService.bindRuntimeIdentity).not.toHaveBeenCalled()
    expect(syncService.resetRuntimeIdentity).not.toHaveBeenCalled()
  })
})
