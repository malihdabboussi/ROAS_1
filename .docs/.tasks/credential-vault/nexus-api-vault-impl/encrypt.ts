import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const SALT_LENGTH = 16
const KEY_LENGTH = 32

function getKey(): Buffer {
  const raw = process.env.CREDENTIAL_VAULT_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY
  if (!raw) {
    throw new Error('CREDENTIAL_VAULT_ENCRYPTION_KEY or ENCRYPTION_KEY required')
  }
  try {
    const buf = Buffer.from(raw, 'base64')
    if (buf.length >= 32) return buf.subarray(0, 32)
  } catch {}
  return Buffer.from(raw.slice(0, 32).padEnd(32, '0'), 'utf8')
}

export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, encrypted, authTag]).toString('base64')
}

export function decrypt(encryptedBase64: string): string {
  const key = getKey()
  const buf = Buffer.from(encryptedBase64, 'base64')
  const iv = buf.subarray(0, IV_LENGTH)
  const authTag = buf.subarray(buf.length - AUTH_TAG_LENGTH)
  const encrypted = buf.subarray(IV_LENGTH, buf.length - AUTH_TAG_LENGTH)
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  decipher.setAuthTag(authTag)
  return decipher.update(encrypted) + decipher.final('utf8')
}
