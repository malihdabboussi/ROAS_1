import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg'
import { createResilientFetch } from './supabase-resilient-fetch'

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name)
  private supabase!: SupabaseClient
  private pgPool: Pool | null = null
  private readonly supabaseFetch = createResilientFetch({
    label: 'queue_worker_db',
    maxRetries: 3,
    timeoutMs: 7000,
  })

  constructor(private readonly configService: ConfigService) {}

  private isDirectDbTransportError(error: unknown): boolean {
    const message = String((error as Error)?.message || '')
    return /self-signed certificate|password authentication failed|ECONNREFUSED|connection timeout|Connection terminated/i.test(
      message,
    )
  }

  private async disablePgPoolFromError(error: unknown) {
    if (!this.pgPool || !this.isDirectDbTransportError(error)) return
    this.logger.warn(
      `Disabling direct Postgres pool after transport failure: ${(error as Error).message}`,
    )
    try {
      await this.pgPool.end()
    } catch {
      // ignore shutdown errors
    }
    this.pgPool = null
  }

  private normalizeDirectDbConnectionString(raw: string): string {
    try {
      const parsed = new URL(raw)
      parsed.searchParams.delete('sslmode')
      parsed.searchParams.delete('sslrootcert')
      parsed.searchParams.delete('sslcert')
      parsed.searchParams.delete('sslkey')
      return parsed.toString()
    } catch {
      return raw
    }
  }

  private isUsableDirectDbUrl(url: string): boolean {
    if (!url.trim()) return false
    if (url.includes('[YOUR_DB_PASSWORD]')) return false
    if (url.includes('://postgres:@')) return false
    return true
  }

  onModuleInit() {
    const url = this.configService.get<string>('supabase.url')
    const serviceRoleKey = this.configService.get<string>('supabase.serviceRoleKey')
    if (!url || !serviceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }

    this.supabase = createClient(url, serviceRoleKey, {
      global: {
        fetch: this.supabaseFetch,
      },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })

    const directDbUrl = this.configService.get<string>('supabase.directDbUrl')
    if (directDbUrl && this.isUsableDirectDbUrl(directDbUrl)) {
      const normalizedDirectDbUrl = this.normalizeDirectDbConnectionString(directDbUrl)
      this.pgPool = new Pool({
        connectionString: normalizedDirectDbUrl,
        max: Number(process.env.SUPABASE_DIRECT_DB_POOL_MAX || 20),
        idleTimeoutMillis: Number(process.env.SUPABASE_DIRECT_DB_IDLE_MS || 30000),
        connectionTimeoutMillis: Number(process.env.SUPABASE_DIRECT_DB_CONNECT_TIMEOUT_MS || 10000),
        ssl: { rejectUnauthorized: false, requestCert: false },
      })
      this.logger.log('Native Postgres direct pool initialized')
    } else if (directDbUrl && !this.isUsableDirectDbUrl(directDbUrl)) {
      this.logger.warn(
        'SUPABASE_DIRECT_DB_URL is set but contains placeholder/invalid credentials; running without native Postgres direct pool',
      )
    } else {
      this.logger.warn(
        'SUPABASE_DIRECT_DB_URL not set; native Postgres direct queries are unavailable',
      )
    }

    this.logger.log('Database service initialized with service role')
  }

  async onModuleDestroy() {
    if (this.pgPool) {
      await this.pgPool.end()
      this.pgPool = null
    }
  }

  getClient(): SupabaseClient {
    return this.supabase
  }

  hasPgPool(): boolean {
    return this.pgPool !== null
  }

  getPgPool(): Pool {
    if (!this.pgPool) {
      throw new Error('Native Postgres direct pool not initialized: set SUPABASE_DIRECT_DB_URL')
    }
    return this.pgPool
  }

  async pgQuery<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<T>> {
    try {
      return await this.getPgPool().query<T>(text, values)
    } catch (error) {
      await this.disablePgPoolFromError(error)
      throw error
    }
  }

  async withPgClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getPgPool().connect()
    try {
      return await fn(client)
    } catch (error) {
      await this.disablePgPoolFromError(error)
      throw error
    } finally {
      client.release()
    }
  }
}
