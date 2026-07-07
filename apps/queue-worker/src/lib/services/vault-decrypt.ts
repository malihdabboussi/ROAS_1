import { createDecipheriv } from 'crypto'

/**
 * Decrypts values stored by API VaultService (aes-256-gcm, iv:authTag:ciphertext hex).
 */
export function decryptVaultValue(ciphertext: string, keyHex: string): string {
  const encryptionKey = Buffer.from(keyHex, 'hex')
  if (encryptionKey.length !== 32) {
    throw new Error('VAULT_ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
  }
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':')
  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error('Invalid encrypted value format')
  }
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey, iv)
  decipher.setAuthTag(authTag)
  return decipher.update(encrypted) + decipher.final('utf8')
}
