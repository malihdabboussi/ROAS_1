import { OnModuleDestroy } from '@nestjs/common'
import type { PoolClient, QueryResult, QueryResultRow } from 'pg'

export declare class PostgresDirectService implements OnModuleDestroy {
  private readonly logger
  private pool
  private getConnectionString
  private getPool
  hasConnectionString(): boolean
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<T>>
  withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T>
  withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T>
  onModuleDestroy(): Promise<void>
}
