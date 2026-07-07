import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'

let PgPool: any = null
try {
  PgPool = require('pg').Pool
} catch {
  PgPool = null
}

@Injectable()
export class PostgresDirectService implements OnModuleDestroy {
  private readonly logger = new Logger(PostgresDirectService.name)
  private pool: any = null

  private getConnectionString(): string {
    const url =
      process.env.SUPABASE_DIRECT_DB_URL || process.env.SUPABASE_DB_URL || process.env.DATABASE_URL
    if (!url) {
      throw new Error('Missing SUPABASE_DIRECT_DB_URL (or SUPABASE_DB_URL / DATABASE_URL)')
    }
    return url
  }

  private getPool() {
    if (!this.pool) {
      if (!PgPool)
        throw new Error('pg module is not installed — cannot create direct Postgres pool')
      this.pool = new PgPool({
        connectionString: this.getConnectionString(),
        max: Number(process.env.SUPABASE_DIRECT_DB_POOL_MAX || 20),
        idleTimeoutMillis: Number(process.env.SUPABASE_DIRECT_DB_IDLE_MS || 30000),
        connectionTimeoutMillis: Number(process.env.SUPABASE_DIRECT_DB_CONNECT_TIMEOUT_MS || 10000),
        ssl: { rejectUnauthorized: false },
      })
      this.logger.log('Native Postgres direct pool initialized')
    }
    return this.pool
  }

  hasConnectionString(): boolean {
    return !!(
      process.env.SUPABASE_DIRECT_DB_URL ||
      process.env.SUPABASE_DB_URL ||
      process.env.DATABASE_URL
    )
  }

  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number | null }> {
    return this.getPool().query(text, values)
  }

  async withClient<T>(fn: (client: any) => Promise<T>): Promise<T> {
    const client = await this.getPool().connect()
    try {
      return await fn(client)
    } finally {
      client.release()
    }
  }

  async withTransaction<T>(fn: (client: any) => Promise<T>): Promise<T> {
    return this.withClient(async (client: any) => {
      await client.query('BEGIN')
      try {
        const result = await fn(client)
        await client.query('COMMIT')
        return result
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      }
    })
  }

  /** Same lock key as mission-worker `DatabaseService.withMissionAdvisoryLock` (per-mission rollup). */
  async withMissionAdvisoryLock<T>(missionId: string, fn: () => Promise<T>): Promise<T> {
    if (!this.hasConnectionString() || !PgPool) {
      return fn()
    }
    return this.withClient(async (client: any) => {
      await client.query('SELECT pg_advisory_lock(abs(hashtext($1::text))::bigint)', [missionId])
      try {
        return await fn()
      } finally {
        await client.query('SELECT pg_advisory_unlock(abs(hashtext($1::text))::bigint)', [
          missionId,
        ])
      }
    })
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end()
      this.pool = null
    }
  }
}
