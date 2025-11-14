import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, generateRandomKey } from '../crypto'

describe('crypto utilities', () => {
  describe('encrypt', () => {
    it('should encrypt plain text', () => {
      const text = 'Hello, World!'
      const password = 'test-password-123'

      const encrypted = encrypt(text, password)

      expect(encrypted).toBeTruthy()
      expect(typeof encrypted).toBe('string')
      expect(encrypted).not.toBe(text)
    })

    it('should produce different ciphertext for same input (due to random salt/iv)', () => {
      const text = 'Same text'
      const password = 'password'

      const encrypted1 = encrypt(text, password)
      const encrypted2 = encrypt(text, password)

      expect(encrypted1).not.toBe(encrypted2)
    })

    it('should handle empty string', () => {
      const text = ''
      const password = 'password'

      const encrypted = encrypt(text, password)

      expect(encrypted).toBeTruthy()
      expect(typeof encrypted).toBe('string')
    })

    it('should handle long text', () => {
      const text = 'A'.repeat(10000)
      const password = 'password'

      const encrypted = encrypt(text, password)

      expect(encrypted).toBeTruthy()
      expect(typeof encrypted).toBe('string')
    })

    it('should handle special characters', () => {
      const text = '!@#$%^&*()_+{}[]|\\:";\'<>?,./~`'
      const password = 'password'

      const encrypted = encrypt(text, password)

      expect(encrypted).toBeTruthy()
    })

    it('should handle unicode characters', () => {
      const text = 'こんにちは世界 🌍 émojis'
      const password = 'password'

      const encrypted = encrypt(text, password)

      expect(encrypted).toBeTruthy()
    })

    it('should return base64 encoded string', () => {
      const text = 'Test'
      const password = 'password'

      const encrypted = encrypt(text, password)

      // Base64 pattern: alphanumeric + / and = for padding
      expect(encrypted).toMatch(/^[A-Za-z0-9+/]+=*$/)
    })

    it('should throw error with invalid password type', () => {
      expect(() => {
        encrypt('text', null as any)
      }).toThrow()
    })

    it('should throw error with empty password', () => {
      expect(() => {
        encrypt('text', '')
      }).toThrow('Password cannot be empty')
    })

    it('should throw error with non-string text', () => {
      expect(() => {
        encrypt(123 as any, 'password')
      }).toThrow('Text must be a string')
    })

    it('should throw error with non-string password', () => {
      expect(() => {
        encrypt('text', { password: 'test' } as any)
      }).toThrow('Password must be a string')
    })
  })

  describe('decrypt', () => {
    it('should decrypt encrypted text', () => {
      const originalText = 'Hello, World!'
      const password = 'test-password-123'

      const encrypted = encrypt(originalText, password)
      const decrypted = decrypt(encrypted, password)

      expect(decrypted).toBe(originalText)
    })

    it('should handle empty string', () => {
      const originalText = ''
      const password = 'password'

      const encrypted = encrypt(originalText, password)
      const decrypted = decrypt(encrypted, password)

      expect(decrypted).toBe(originalText)
    })

    it('should handle long text', () => {
      const originalText = 'Long text content. '.repeat(500)
      const password = 'password'

      const encrypted = encrypt(originalText, password)
      const decrypted = decrypt(encrypted, password)

      expect(decrypted).toBe(originalText)
    })

    it('should handle special characters', () => {
      const originalText = '!@#$%^&*()_+{}[]|\\:";\'<>?,./~`'
      const password = 'password'

      const encrypted = encrypt(originalText, password)
      const decrypted = decrypt(encrypted, password)

      expect(decrypted).toBe(originalText)
    })

    it('should handle unicode characters', () => {
      const originalText = 'こんにちは世界 🌍 émojis'
      const password = 'password'

      const encrypted = encrypt(originalText, password)
      const decrypted = decrypt(encrypted, password)

      expect(decrypted).toBe(originalText)
    })

    it('should fail with wrong password', () => {
      const originalText = 'Secret message'
      const password = 'correct-password'
      const wrongPassword = 'wrong-password'

      const encrypted = encrypt(originalText, password)

      expect(() => {
        decrypt(encrypted, wrongPassword)
      }).toThrow(/Decryption failed/)
    })

    it('should fail with invalid encrypted data', () => {
      // Use a valid Base64 string that will fail decryption
      const invalidEncrypted = 'YWJjZGVmZ2hpamtsbW5vcA==' // Valid Base64, but too short for our encryption format
      const password = 'password'

      expect(() => {
        decrypt(invalidEncrypted, password)
      }).toThrow(/Decryption failed/)
    })

    it('should fail with corrupted encrypted data', () => {
      const originalText = 'Test'
      const password = 'password'

      const encrypted = encrypt(originalText, password)
      // Corrupt the base64 data
      const corrupted = encrypted.slice(0, -5) + 'XXXXX'

      expect(() => {
        decrypt(corrupted, password)
      }).toThrow(/Decryption failed/)
    })

    it('should fail with empty encrypted string', () => {
      const password = 'password'

      expect(() => {
        decrypt('', password)
      }).toThrow()
    })

    it('should fail with tampered auth tag', () => {
      const originalText = 'Sensitive data'
      const password = 'password'

      const encrypted = encrypt(originalText, password)
      const buffer = Buffer.from(encrypted, 'base64')

      // Tamper with the auth tag (bytes 64-80)
      if (buffer.length > 80) {
        buffer[70] = buffer[70] ^ 0xFF
      }

      const tampered = buffer.toString('base64')

      expect(() => {
        decrypt(tampered, password)
      }).toThrow(/Decryption failed/)
    })

    it('should throw error with non-string encrypted data', () => {
      expect(() => {
        decrypt(123 as any, 'password')
      }).toThrow('Encrypted data must be a string')
    })

    it('should throw error with non-string password', () => {
      const encrypted = encrypt('test', 'password')
      expect(() => {
        decrypt(encrypted, null as any)
      }).toThrow('Password must be a string')
    })

    it('should throw error with empty password', () => {
      const encrypted = encrypt('test', 'password')
      expect(() => {
        decrypt(encrypted, '')
      }).toThrow('Password cannot be empty')
    })

    it('should throw error with empty encrypted data', () => {
      expect(() => {
        decrypt('', 'password')
      }).toThrow('Encrypted data cannot be empty')
    })

    it('should throw error with invalid Base64 format', () => {
      expect(() => {
        decrypt('not valid base64!@#', 'password')
      }).toThrow('Encrypted data must be valid Base64 format')
    })
  })

  describe('encrypt/decrypt round-trip', () => {
    const testCases = [
      { name: 'simple text', text: 'Hello', password: 'pass' },
      { name: 'multi-line', text: 'Line 1\nLine 2\nLine 3', password: 'password123' },
      { name: 'JSON data', text: JSON.stringify({ id: 1, name: 'Test' }), password: 'json-pass' },
      { name: 'very long password', text: 'text', password: 'very-long-password-with-many-characters-123456' },
      { name: 'numbers', text: '123456789', password: 'pass' },
      { name: 'whitespace', text: '   spaces   ', password: 'pass' },
    ]

    testCases.forEach(({ name, text, password }) => {
      it(`should handle round-trip for ${name}`, () => {
        const encrypted = encrypt(text, password)
        const decrypted = decrypt(encrypted, password)

        expect(decrypted).toBe(text)
      })
    })
  })

  describe('generateRandomKey', () => {
    it('should generate random key with default length', () => {
      const key = generateRandomKey()

      expect(key).toBeTruthy()
      expect(typeof key).toBe('string')
      // Default length 32 bytes = 64 hex characters
      expect(key.length).toBe(64)
    })

    it('should generate random key with custom length', () => {
      const length = 16
      const key = generateRandomKey(length)

      expect(key.length).toBe(length * 2) // hex encoding doubles the length
    })

    it('should generate different keys each time', () => {
      const key1 = generateRandomKey()
      const key2 = generateRandomKey()
      const key3 = generateRandomKey()

      expect(key1).not.toBe(key2)
      expect(key2).not.toBe(key3)
      expect(key1).not.toBe(key3)
    })

    it('should generate hex-encoded key', () => {
      const key = generateRandomKey()

      // Hex pattern: 0-9, a-f
      expect(key).toMatch(/^[0-9a-f]+$/)
    })

    it('should handle very small length', () => {
      const key = generateRandomKey(1)

      expect(key.length).toBe(2)
      expect(key).toMatch(/^[0-9a-f]+$/)
    })

    it('should handle large length', () => {
      const key = generateRandomKey(256)

      expect(key.length).toBe(512)
      expect(key).toMatch(/^[0-9a-f]+$/)
    })

    it('should be cryptographically random', () => {
      // Generate many keys and ensure they're all unique
      const keys = new Set<string>()
      const count = 1000

      for (let i = 0; i < count; i++) {
        keys.add(generateRandomKey())
      }

      // All keys should be unique
      expect(keys.size).toBe(count)
    })
  })

  describe('Security properties', () => {
    it('should use different salt for each encryption', () => {
      const text = 'Same text'
      const password = 'same-password'

      const encrypted1 = encrypt(text, password)
      const encrypted2 = encrypt(text, password)

      // Extract salt (first 64 bytes of base64 decoded)
      const buffer1 = Buffer.from(encrypted1, 'base64')
      const buffer2 = Buffer.from(encrypted2, 'base64')

      const salt1 = buffer1.subarray(0, 64)
      const salt2 = buffer2.subarray(0, 64)

      expect(salt1.equals(salt2)).toBe(false)
    })

    it('should use different IV for each encryption', () => {
      const text = 'Same text'
      const password = 'same-password'

      const encrypted1 = encrypt(text, password)
      const encrypted2 = encrypt(text, password)

      // Extract IV (bytes 64-80 of base64 decoded)
      const buffer1 = Buffer.from(encrypted1, 'base64')
      const buffer2 = Buffer.from(encrypted2, 'base64')

      const iv1 = buffer1.subarray(64, 80)
      const iv2 = buffer2.subarray(64, 80)

      expect(iv1.equals(iv2)).toBe(false)
    })

    it('should produce authenticated ciphertext', () => {
      // This is implicitly tested by the tamper detection test
      // AES-GCM provides authentication via auth tag
      const text = 'Test'
      const password = 'password'

      const encrypted = encrypt(text, password)
      const buffer = Buffer.from(encrypted, 'base64')

      // Auth tag should be present (16 bytes at position 80-96)
      expect(buffer.length).toBeGreaterThan(96)
    })
  })

  describe('Edge cases', () => {
    it('should handle very short password', () => {
      const text = 'Test'
      const password = 'a'

      const encrypted = encrypt(text, password)
      const decrypted = decrypt(encrypted, password)

      expect(decrypted).toBe(text)
    })

    it('should handle password with special characters', () => {
      const text = 'Test'
      const password = '!@#$%^&*()_+-=[]{}|;:,.<>?'

      const encrypted = encrypt(text, password)
      const decrypted = decrypt(encrypted, password)

      expect(decrypted).toBe(text)
    })

    it('should handle password with unicode', () => {
      const text = 'Test'
      const password = 'パスワード🔒'

      const encrypted = encrypt(text, password)
      const decrypted = decrypt(encrypted, password)

      expect(decrypted).toBe(text)
    })

    it('should reject decryption with empty password', () => {
      const text = 'Test'
      const password = 'password'

      const encrypted = encrypt(text, password)

      expect(() => {
        decrypt(encrypted, '')
      }).toThrow()
    })
  })
})
