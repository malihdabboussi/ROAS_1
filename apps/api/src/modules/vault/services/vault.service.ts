import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import { VaultRepository } from '../repositories/vault.repository'

export interface VaultSecret {
  id: string
  user_id: string
  provider: string
  label: string
  secret_type: string
  encrypted_value: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

@Injectable()
export class VaultService {
  private readonly encryptionKey: Buffer | null

  constructor(
    private readonly config: ConfigService,
    private readonly vaultRepository: VaultRepository,
  ) {
    const key = this.config.get<string>('VAULT_ENCRYPTION_KEY') || ''
    this.encryptionKey = this.parseEncryptionKey(key)
  }

  private parseEncryptionKey(key: string): Buffer | null {
    const trimmed = key.trim()
    if (!/^[a-f0-9]{64}$/i.test(trimmed)) return null
    const decoded = Buffer.from(trimmed, 'hex')
    return decoded.length === 32 ? decoded : null
  }

  private getEncryptionKey(): Buffer {
    if (!this.encryptionKey) {
      throw new InternalServerErrorException('Vault encryption is not configured')
    }
    return this.encryptionKey
  }

  private encrypt(plaintext: string): string {
    const encryptionKey = this.getEncryptionKey()
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv)
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
  }

  private decrypt(ciphertext: string): string {
    const encryptionKey = this.getEncryptionKey()
    const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':')
    if (!ivHex || !authTagHex || !encryptedHex) {
      throw new BadRequestException('Invalid encrypted value format')
    }
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const encrypted = Buffer.from(encryptedHex, 'hex')
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey, iv)
    decipher.setAuthTag(authTag)
    return decipher.update(encrypted) + decipher.final('utf8')
  }

  async storeSecret(
    userId: string,
    provider: string,
    label: string,
    value: string,
    secretType: string = 'api_key',
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    const encryptedValue = this.encrypt(value)

    await this.vaultRepository.upsertSecret({
      userId,
      provider,
      label,
      secretType,
      encryptedValue,
      metadata,
      updatedAt: new Date().toISOString(),
    })
  }

  async getSecret(userId: string, provider: string, label: string): Promise<string | null> {
    const encryptedValue = await this.vaultRepository.findEncryptedSecret(userId, provider, label)
    if (!encryptedValue) return null
    return this.decrypt(encryptedValue)
  }

  async getSecretsByProvider(userId: string, provider: string): Promise<VaultSecret[]> {
    return this.vaultRepository.listSecretsByProvider(userId, provider)
  }

  async listSecrets(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<
    Array<{
      id: string
      provider: string
      label: string
      secret_type: string
      metadata: Record<string, unknown>
      created_at: string
    }>
  > {
    return this.vaultRepository.listSecrets(supabase, userId)
  }

  async deleteSecret(userId: string, provider: string, label: string): Promise<void> {
    await this.vaultRepository.deleteSecret(userId, provider, label)
  }

  async hasSecret(userId: string, provider: string, label: string): Promise<boolean> {
    return this.vaultRepository.hasSecret(userId, provider, label)
  }
}
