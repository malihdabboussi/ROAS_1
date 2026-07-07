import { describe, expect, it, vi } from 'vitest'
import { AdminService } from './admin.service'

function makeQuery(rows: Array<{ app: string; severity: string }>) {
  const query = {
    select: vi.fn().mockReturnThis(),
    gte: vi.fn().mockResolvedValue({ data: rows, error: null }),
  }
  return query
}

describe('AdminService', () => {
  it('aggregates recent app errors by app and severity', async () => {
    const rows = [
      { app: 'api', severity: 'error' },
      { app: 'api', severity: 'critical' },
      { app: 'web', severity: 'error' },
    ]
    const query = makeQuery(rows)
    const repository = {
      serviceTable: vi.fn().mockReturnValue(query),
      listAuthUsers: vi.fn(),
    }
    const service = new AdminService(
      {} as never,
      {} as never,
      repository as never,
      {} as never,
      {} as never,
      {} as never,
    )

    await expect(service.getOperations()).resolves.toEqual({
      totalErrors24h: 3,
      errorsByApp: [
        { app: 'api', count: 2 },
        { app: 'web', count: 1 },
      ],
      errorsBySeverity: [
        { severity: 'error', count: 2 },
        { severity: 'critical', count: 1 },
      ],
    })
  })
})
