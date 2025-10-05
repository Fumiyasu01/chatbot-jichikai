import { readFileSync } from 'fs'

const text = readFileSync('/tmp/zeami/97enm.txt', 'utf-8')

console.log('Original text length:', text.length)
console.log('First 200 chars:', text.substring(0, 200))

// Manually test normalization
const normalizedText = text
  .split('\n')
  .map(line => line.replace(/[ \t]+/g, ' ').trim())
  .join('\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim()

console.log('\nNormalized text length:', normalizedText.length)
console.log('Normalized first 300 chars:', normalizedText.substring(0, 300))

// Import and test chunking
const { splitIntoChunks } = require('../src/lib/utils/chunking')
const chunks = splitIntoChunks(text, 400, 100)

console.log('\n=== CHUNKING RESULTS ===')
console.log('Number of chunks:', chunks.length)
console.log('Chunk sizes:', chunks.map(c => c.length))

chunks.forEach((chunk, i) => {
  console.log(`\n--- Chunk ${i + 1} (${chunk.length} chars) ---`)
  console.log(chunk.substring(0, 200) + '...')
})
