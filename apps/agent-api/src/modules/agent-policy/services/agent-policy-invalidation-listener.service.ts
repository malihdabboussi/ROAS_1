import { Injectable, Logger } from '@nestjs/common'
import { Client } from 'pg'

export type AgentPolicyInvalidationHandler = (payload: string | undefined) => void

@Injectable()
export class AgentPolicyInvalidationListenerService {
  private readonly logger = new Logger(AgentPolicyInvalidationListenerService.name)
  private listener: Client | null = null

  async start(handleInvalidation: AgentPolicyInvalidationHandler): Promise<void> {
    const connectionString =
      process.env.SUPABASE_DIRECT_DB_URL || process.env.SUPABASE_DB_URL || process.env.DATABASE_URL
    if (!connectionString) {
      this.logger.warn('agent_policy_invalidate LISTEN skipped: SUPABASE_DIRECT_DB_URL is not set')
      return
    }
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })
    client.on('notification', (message) => handleInvalidation(message.payload))
    client.on('error', (error) => {
      this.logger.warn(`agent_policy_invalidate listener error: ${error.message}`)
    })
    await client.connect()
    await client.query('LISTEN agent_policy_invalidate')
    this.listener = client
  }

  async stop(): Promise<void> {
    if (!this.listener) return
    await this.listener.end().catch(() => undefined)
    this.listener = null
  }
}
