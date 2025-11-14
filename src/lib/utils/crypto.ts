import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const SALT_LENGTH = 64
const TAG_LENGTH = 16
const KEY_LENGTH = 32

/**
 * Derives a key from a password using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha512')
}

/**
 * Encrypts a string using AES-256-GCM
 * @param text - The plain text to encrypt
 * @param password - The encryption password
 * @returns Base64 encoded encrypted string
 */
export function encrypt(text: string, password: string): string {
  // Input validation
  if (typeof text !== 'string') {
    throw new Error('Text must be a string')
  }
  if (typeof password !== 'string') {
    throw new Error('Password must be a string')
  }
  if (password.length === 0) {
    throw new Error('Password cannot be empty')
  }

  try {
    const salt = crypto.randomBytes(SALT_LENGTH)
    const key = deriveKey(password, salt)
    const iv = crypto.randomBytes(IV_LENGTH)

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const tag = cipher.getAuthTag()

    // Combine: salt + iv + tag + encrypted
    const result = Buffer.concat([
      salt,
      iv,
      tag,
      Buffer.from(encrypted, 'hex')
    ])

    return result.toString('base64')
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Decrypts an AES-256-GCM encrypted string
 * @param encryptedData - Base64 encoded encrypted string
 * @param password - The decryption password
 * @returns Decrypted plain text
 */
export function decrypt(encryptedData: string, password: string): string {
  // Input validation
  if (typeof encryptedData !== 'string') {
    throw new Error('Encrypted data must be a string')
  }
  if (typeof password !== 'string') {
    throw new Error('Password must be a string')
  }
  if (password.length === 0) {
    throw new Error('Password cannot be empty')
  }
  if (encryptedData.length === 0) {
    throw new Error('Encrypted data cannot be empty')
  }
  // Validate Base64 format
  if (!/^[A-Za-z0-9+/]+=*$/.test(encryptedData)) {
    throw new Error('Encrypted data must be valid Base64 format')
  }

  try {
    const buffer = Buffer.from(encryptedData, 'base64')

    const salt = buffer.subarray(0, SALT_LENGTH)
    const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
    const tag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
    const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH)

    const key = deriveKey(password, salt)

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)

    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generates a random secure key
 * @param length - Length of the key (default: 32)
 * @returns Hex encoded random key
 */
export function generateRandomKey(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}
