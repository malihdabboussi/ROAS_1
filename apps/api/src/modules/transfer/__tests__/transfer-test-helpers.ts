import { vi } from 'vitest'
import { TransferCampaignCopyRepository } from '../repositories/transfer-campaign-copy.repository'
import { TransferRepository } from '../repositories/transfer.repository'
import { TransferSpaceRepository } from '../repositories/transfer-space.repository'
import { TransferViewRepository } from '../repositories/transfer-view.repository'
import { TransferService } from '../services/transfer.service'

export type QueryResult = {
  data?: unknown
  error?: { message: string } | null
  count?: number | null
}

type MockFn = ReturnType<typeof vi.fn>
type QueryThen = (
  resolve: (value: QueryResult) => unknown,
  reject?: (reason: unknown) => unknown,
) => Promise<unknown>

export type ProjectQueryMock = {
  select: MockFn
  eq: MockFn
  update: MockFn
  insert: MockFn
  single: MockFn
}

export type QueuedQueryMock = {
  select: MockFn
  eq: MockFn
  is: MockFn
  in: MockFn
  not: MockFn
  neq: MockFn
  single: MockFn
  then: QueryThen
}

export type MutationQueryMock = QueuedQueryMock & {
  update: MockFn
  insert: MockFn
  delete: MockFn
}

export type SupabaseWithQueriesMock = {
  from: MockFn
}

export type OrgRoleQueryMock = {
  select: MockFn
  eq: MockFn
  single: MockFn
}

export function createProjectQuery(project: unknown): ProjectQueryMock {
  const query = {} as ProjectQueryMock
  query.select = vi.fn(() => query)
  query.eq = vi.fn(() => query)
  query.update = vi.fn(() => query)
  query.insert = vi.fn(() => query)
  query.single = vi
    .fn()
    .mockResolvedValue({ data: project, error: project ? null : { message: 'no rows' } })
  return query
}

export function createQueuedQuery(result: QueryResult): QueuedQueryMock {
  const query = {} as QueuedQueryMock
  query.select = vi.fn(() => query)
  query.eq = vi.fn(() => query)
  query.is = vi.fn(() => query)
  query.in = vi.fn(() => query)
  query.not = vi.fn(() => query)
  query.neq = vi.fn(() => query)
  query.single = vi.fn().mockResolvedValue(result)
  query.then = (
    resolve: (value: QueryResult) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject)
  return query
}

export function createQueuedSupabase(queues: Record<string, QueryResult[]>): SupabaseWithQueriesMock {
  return {
    from: vi.fn((table: string) => {
      const result = queues[table]?.shift()
      if (!result) throw new Error(`Unexpected transfer table query: ${table}`)
      return createQueuedQuery(result)
    }),
  }
}

export function createMutationQuery(result: QueryResult = { error: null }): MutationQueryMock {
  const query = {} as MutationQueryMock
  query.select = vi.fn(() => query)
  query.update = vi.fn(() => query)
  query.insert = vi.fn(() => query)
  query.delete = vi.fn(() => query)
  query.eq = vi.fn(() => query)
  query.is = vi.fn(() => query)
  query.in = vi.fn(() => query)
  query.not = vi.fn(() => query)
  query.neq = vi.fn(() => query)
  query.single = vi.fn().mockResolvedValue(result)
  query.then = (
    resolve: (value: QueryResult) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject)
  return query
}

export function createSupabaseWithQueries(queues: Record<string, unknown[]>): SupabaseWithQueriesMock {
  return {
    from: vi.fn((table: string) => {
      const query = queues[table]?.shift()
      if (!query) throw new Error(`Unexpected transfer table query: ${table}`)
      return query
    }),
  }
}

export function createOrgRoleQuery(role: string | null): OrgRoleQueryMock {
  const query = {} as OrgRoleQueryMock
  query.select = vi.fn(() => query)
  query.eq = vi.fn(() => query)
  query.single = vi.fn().mockResolvedValue({
    data: role ? { role } : null,
    error: role ? null : { message: 'no rows' },
  })
  return query
}

export function createTransferService(supabase: unknown) {
  return new TransferService(
    { client: supabase } as never,
    new TransferRepository(),
    new TransferViewRepository(),
    new TransferCampaignCopyRepository(),
    new TransferSpaceRepository(),
  )
}
