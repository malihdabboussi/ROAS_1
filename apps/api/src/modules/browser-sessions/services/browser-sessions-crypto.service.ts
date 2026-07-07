import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

/**
 * AES-256-GCM envelope for browser session cookies.
 *
 * Key source (in order of precedence):
 *   1. BROWSER_SESSION_ENCRYPTION_KEY (dedicated, recommended)
 *   2. VAULT_ENCRYPTION_KEY           (shared fallback)
 *
 * Encoded payload format: `ivHex:authTagHex:ciphertextHex`
 * Matches the VaultService envelope so tooling is consistent.
 */
@Injectable()
export class BrowserSessionsCryptoService implements OnModuleInit {
  private readonly logger = new Logger(BrowserSessionsCryptoService.name)
  private encryptionKey: Buffer | null = null

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const raw =
      this.config.get<string>('BROWSER_SESSION_ENCRYPTION_KEY') ||
      this.config.get<string>('VAULT_ENCRYPTION_KEY') ||
      ''
    if (!raw) {
      this.logger.error(
        'Missing BROWSER_SESSION_ENCRYPTION_KEY / VAULT_ENCRYPTION_KEY — session sync disabled',
      )
      return
    }
    let buf: Buffer | null = null
    try {
      buf = Buffer.from(raw, 'hex')
    } catch {
      buf = null
    }
    if (!buf || buf.length !== 32) {
      this.logger.error('Encryption key must decode to 32 bytes (64 hex chars)')
      return
    }
    this.encryptionKey = buf
  }

  encrypt(plaintext: string): string {
    if (!this.encryptionKey) {
      throw new InternalServerErrorException('Browser session encryption is not configured')
    }
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv)
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
  }

  decrypt(ciphertext: string): string {
    if (!this.encryptionKey) {
      throw new InternalServerErrorException('Browser session encryption is not configured')
    }
    const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':')
    if (!ivHex || !authTagHex || !encryptedHex) {
      throw new InternalServerErrorException('Malformed encrypted session payload')
    }
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      Buffer.from(ivHex, 'hex'),
    )
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, 'hex')),
      decipher.final(),
    ])
    return decrypted.toString('utf8')
  }
}
