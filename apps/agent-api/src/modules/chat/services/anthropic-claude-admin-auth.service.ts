import { createDecipheriv } from 'crypto'
import { Injectable, Logger } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { ChatAdminAuthRepository } from '../repositories/chat-admin-auth.repository'

const ANTHROPIC_CLAUDE_INTEGRATION_ID = 'anthropic_claude'
const ANTHROPIC_CLAUDE_PROVIDER = 'anthropic'
const ANTHROPIC_CLAUDE_VAULT_LABEL = 'setup-token:default'
const ANTHROPIC_CLAUDE_TOKEN_PREFIX = 'sk-ant-oat01-'
const ANTHROPIC_CLAUDE_TOKEN_MIN_LENGTH = 80

type AnthropicClaudeRuntimeCredential = {
  provider: typeof ANTHROPIC_CLAUDE_PROVIDER
  accessToken: string
}

@Injectable()
export class AnthropicClaudeAdminAuthService {
  private readonly logger = new Logger(AnthropicClaudeAdminAuthService.name)

  constructor(
    private readonly serviceClient: SupabaseServiceClient,
    private readonly repository: ChatAdminAuthRepository = new ChatAdminAuthRepository(),
  ) {}

  private get supabase() {
    return this.serviceClient.client
  }

  async resolveRuntimeCredential(
    userId: string | undefined,
  ): Promise<AnthropicClaudeRuntimeCredential | null> {
    if (!userId) {
      // #region agent log
      fetch('http://127.0.0.1:7681/ingest/94e24cc9-0e93-41a4-9d43-69640004018c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cacf83'},body:JSON.stringify({sessionId:'cacf83',location:'anthropic-claude-admin-auth.service.ts:resolveRuntimeCredential',message:'claude_auth_no_user_id',data:{hasUserId:false},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      return null
    }
    const isAdmin = await this.isPlatformAdmin(userId)
    if (!isAdmin) {
      // #region agent log
      fetch('http://127.0.0.1:7681/ingest/94e24cc9-0e93-41a4-9d43-69640004018c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cacf83'},body:JSON.stringify({sessionId:'cacf83',location:'anthropic-claude-admin-auth.service.ts:resolveRuntimeCredential',message:'claude_auth_not_admin',data:{userIdPresent:true,isAdmin:false},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      return null
    }

    const connection = await this.loadConnection(userId)
    if (!connection) {
      // #region agent log
      fetch('http://127.0.0.1:7681/ingest/94e24cc9-0e93-41a4-9d43-69640004018c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cacf83'},body:JSON.stringify({sessionId:'cacf83',location:'anthropic-claude-admin-auth.service.ts:resolveRuntimeCredential',message:'claude_auth_no_connection',data:{isAdmin:true,hasConnection:false},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      return null
    }

    const label =
      typeof connection.metadata?.vault_secret_label === 'string'
        ? connection.metadata.vault_secret_label
        : ANTHROPIC_CLAUDE_VAULT_LABEL
    const accessToken = await this.loadSetupToken(userId, label)
    if (!accessToken) {
      // #region agent log
      fetch('http://127.0.0.1:7681/ingest/94e24cc9-0e93-41a4-9d43-69640004018c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cacf83'},body:JSON.stringify({sessionId:'cacf83',location:'anthropic-claude-admin-auth.service.ts:resolveRuntimeCredential',message:'claude_auth_vault_token_missing',data:{isAdmin:true,hasConnection:true,vaultLabel:label},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return null
    }

    // #region agent log
    fetch('http://127.0.0.1:7681/ingest/94e24cc9-0e93-41a4-9d43-69640004018c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cacf83'},body:JSON.stringify({sessionId:'cacf83',location:'anthropic-claude-admin-auth.service.ts:resolveRuntimeCredential',message:'claude_auth_token_resolved',data:{isAdmin:true,hasConnection:true,vaultLabel:label,tokenLen:accessToken.length,tokenPrefix:accessToken.slice(0,15),validPrefix:accessToken.startsWith(ANTHROPIC_CLAUDE_TOKEN_PREFIX),trimmed:accessToken===accessToken.trim()},timestamp:Date.now(),hypothesisId:'A,B,C'})}).catch(()=>{});
    // #endregion

    return {
      provider: ANTHROPIC_CLAUDE_PROVIDER,
      accessToken,
    }
  }

  private async isPlatformAdmin(userId: string): Promise<boolean> {
    const { role, error } = await this.repository.findUserRole(this.supabase, userId)

    if (error) {
      this.logger.warn(`Claude admin role lookup failed: ${error.message}`)
      return false
    }

    return role === 'admin' || role === 'superadmin'
  }

  private async loadConnection(userId: string): Promise<{
    metadata?: Record<string, unknown> | null
  } | null> {
    const { connection, error } = await this.repository.findAnthropicConnection(
      this.supabase,
      userId,
      ANTHROPIC_CLAUDE_INTEGRATION_ID,
    )

    if (error) {
      this.logger.warn(`Claude connection lookup failed: ${error.message}`)
      return null
    }
    if (!connection || connection.status !== 'connected') return null
    return connection
  }

  private async loadSetupToken(userId: string, label: string): Promise<string | null> {
    const { encryptedValue, error } = await this.repository.findVaultEncryptedValue(
      this.supabase,
      {
        userId,
        provider: ANTHROPIC_CLAUDE_PROVIDER,
        label,
      },
    )

    if (error) {
      this.logger.warn(`Claude vault lookup failed: ${error.message}`)
      return null
    }
    if (!encryptedValue) return null
    try {
      return this.parseSetupToken(this.decrypt(encryptedValue))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error'
      this.logger.warn(`Claude vault token could not be read: ${message}`)
      if (message === 'Vault encryption is not configured') throw error
      return null
    }
  }

  private parseSetupToken(raw: string): string {
    const token = raw.trim()
    if (
      !token.startsWith(ANTHROPIC_CLAUDE_TOKEN_PREFIX) ||
      token.length < ANTHROPIC_CLAUDE_TOKEN_MIN_LENGTH
    ) {
      throw new Error('Claude setup token is invalid')
    }
    return token
  }

  private decrypt(ciphertext: string): string {
    const key = this.requireEncryptionKey()
    const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':')
    if (!ivHex || !authTagHex || !encryptedHex) {
      throw new Error('Claude vault token format is invalid')
    }
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const encrypted = Buffer.from(encryptedHex, 'hex')
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    return decipher.update(encrypted) + decipher.final('utf8')
  }

  private requireEncryptionKey(): Buffer {
    const key = process.env.VAULT_ENCRYPTION_KEY?.trim() ?? ''
    if (!/^[a-f0-9]{64}$/i.test(key)) {
      throw new Error('Vault encryption is not configured')
    }
    const decoded = Buffer.from(key, 'hex')
    if (decoded.length !== 32) {
      throw new Error('Vault encryption is not configured')
    }
    return decoded
  }
}
