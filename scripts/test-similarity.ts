import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import crypto from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const encryptionPassword = process.env.SUPER_ADMIN_KEY || 'default-password'

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const roomId = '2026e6cd-8087-4ce5-b92e-67fdcf0c8b1a'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const SALT_LENGTH = 64
const TAG_LENGTH = 16
const KEY_LENGTH = 32

function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha512')
}

function decrypt(encryptedData: string, password: string): string {
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

async function testSimilarity() {
  // Get room and decrypt API key
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('openai_api_key')
    .eq('id', roomId)
    .single()

  if (roomError || !room || !room.openai_api_key) {
    console.error('Room not found or API key missing:', roomError)
    process.exit(1)
  }

  const openaiApiKey = decrypt(room.openai_api_key, encryptionPassword)
  const openai = new OpenAI({ apiKey: openaiApiKey })
  const testQueries = [
    '加入世帯数はどれくらい？',
    '450世帯',
    '世帯数',
    '自治会',
    '会費',
  ]

  for (const query of testQueries) {
    console.log(`\n=== Testing query: "${query}" ===\n`)

    // Generate embedding for query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    })

    const queryEmbedding = embeddingResponse.data[0].embedding

    // Test with different thresholds
    const thresholds = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]

    for (const threshold of thresholds) {
      const { data: matchedDocs, error } = await supabase.rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: 5,
        room_id: roomId,
      })

      if (error) {
        console.error(`Error at threshold ${threshold}:`, error)
        continue
      }

      console.log(`Threshold ${threshold}: ${matchedDocs?.length || 0} results`)
      if (matchedDocs && matchedDocs.length > 0) {
        matchedDocs.forEach((doc: any, i: number) => {
          console.log(`  [${i + 1}] Similarity: ${doc.similarity?.toFixed(4)} | ${doc.file_name}`)
          console.log(`      Content: ${doc.content.substring(0, 100)}...`)
        })
      }
    }
  }
}

testSimilarity().catch(console.error)
