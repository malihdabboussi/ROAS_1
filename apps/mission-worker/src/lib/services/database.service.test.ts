import type { ConfigService } from '@nestjs/config'
import type { Pool } from 'pg'
import { describe, expect, it, vi } from 'vitest'
import { DatabaseService } from './database.service'

describe('DatabaseService', () => {
  it('detaches a failed Postgres pool before waiting for it to close', async () => {
    let finishClosing: (() => void) | undefined
    const end = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishClosing = resolve
        }),
    )
    const service = new DatabaseService({} as ConfigService)
    const internals = service as unknown as {
      pgPool: Pool | null
      disablePgPoolFromError(error: unknown): Promise<void>
    }
    internals.pgPool = { end } as unknown as Pool

    const disabling = internals.disablePgPoolFromError(new Error('Connection terminated'))

    expect(service.hasPgPool()).toBe(false)
    expect(end).toHaveBeenCalledOnce()

    finishClosing?.()
    await disabling
  })
})
