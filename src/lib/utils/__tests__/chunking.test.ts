import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  splitIntoChunks,
  addContextualHeaders,
  estimateTokenCount,
} from '../chunking'

describe('chunking utilities', () => {
  describe('splitIntoChunks', () => {
    it('should return empty array for empty text', () => {
      const result = splitIntoChunks('')

      expect(result).toEqual([])
    })

    it('should return empty array for whitespace-only text', () => {
      const result = splitIntoChunks('   \n\n   ')

      expect(result).toEqual([])
    })

    it('should return single chunk for short text', () => {
      const text = 'This is a short text.'
      const result = splitIntoChunks(text, 1000)

      expect(result).toHaveLength(1)
      expect(result[0]).toBe(text)
    })

    it('should split long text into multiple chunks', () => {
      const text = 'A'.repeat(3000)
      const chunkSize = 1000
      const result = splitIntoChunks(text, chunkSize)

      expect(result.length).toBeGreaterThan(1)
      result.forEach(chunk => {
        expect(chunk.length).toBeLessThanOrEqual(chunkSize * 1.2) // Allow some margin
      })
    })

    it('should respect chunk size parameter', () => {
      const text = 'Word '.repeat(500) // ~2500 chars
      const chunkSize = 500
      const result = splitIntoChunks(text, chunkSize)

      expect(result.length).toBeGreaterThan(1)
      // Most chunks should be near the chunk size
      result.forEach(chunk => {
        expect(chunk.length).toBeGreaterThan(0)
        expect(chunk.length).toBeLessThanOrEqual(chunkSize * 1.5)
      })
    })

    it('should normalize whitespace', () => {
      const text = 'Text   with    multiple    spaces'
      const result = splitIntoChunks(text, 1000)

      expect(result[0]).toBe('Text with multiple spaces')
    })

    it('should preserve line breaks', () => {
      const text = 'Line 1\nLine 2\nLine 3'
      const result = splitIntoChunks(text, 1000)

      expect(result[0]).toBe('Line 1\nLine 2\nLine 3')
    })

    it('should collapse excessive newlines', () => {
      const text = 'Line 1\n\n\n\n\nLine 2'
      const result = splitIntoChunks(text, 1000)

      expect(result[0]).toBe('Line 1\n\nLine 2')
    })

    it('should split at sentence boundaries when possible', () => {
      const text = 'First sentence. Second sentence. Third sentence.'
      const chunkSize = 30
      const result = splitIntoChunks(text, chunkSize)

      expect(result.length).toBeGreaterThan(1)
      // Chunks should end with sentence endings
      result.slice(0, -1).forEach(chunk => {
        const lastChar = chunk.trim().slice(-1)
        expect(['.', '!', '?', '\n']).toContain(lastChar)
      })
    })

    it('should handle overlap between chunks', () => {
      const text = 'A'.repeat(2000)
      const chunkSize = 500
      const overlap = 100
      const result = splitIntoChunks(text, chunkSize, overlap)

      expect(result.length).toBeGreaterThan(1)
      // Check for overlap by comparing end of one chunk with start of next
      for (let i = 0; i < result.length - 1; i++) {
        const currentChunk = result[i]
        const nextChunk = result[i + 1]

        // There should be some overlapping content
        if (overlap > 0) {
          const currentEnd = currentChunk.slice(-overlap)
          const hasOverlap = nextChunk.includes(currentEnd.slice(0, 50))
          // Overlap might not be perfect due to boundary adjustments
          expect(hasOverlap).toBe(true)
        }
      }
    })

    it('should handle text with markdown headings', () => {
      const text = `
## Section 1
Content for section 1.

### Subsection 1.1
More content here.

## Section 2
Content for section 2.
      `.trim()

      const result = splitIntoChunks(text, 100)

      expect(result.length).toBeGreaterThan(0)
      // Should preserve heading structure
      expect(result.some(chunk => chunk.includes('##'))).toBe(true)
    })

    it('should split at markdown headings when appropriate', () => {
      const text = `
## Section 1
${'Content. '.repeat(100)}

## Section 2
${'More content. '.repeat(100)}
      `.trim()

      const result = splitIntoChunks(text, 500, 0)

      // Should split near section boundaries
      expect(result.length).toBeGreaterThan(1)
    })

    it('should handle mixed content types', () => {
      const text = `
# Main Title
Regular paragraph text.

## Section 1
- Bullet point 1
- Bullet point 2

Code block:
\`\`\`
const x = 1;
\`\`\`

### Subsection
More text here.
      `.trim()

      const result = splitIntoChunks(text, 200, 50)

      expect(result.length).toBeGreaterThan(0)
      result.forEach(chunk => {
        expect(chunk.length).toBeGreaterThan(0)
      })
    })

    it('should handle very long words without infinite loop', () => {
      const text = 'A'.repeat(2000) + ' B'.repeat(2000)
      const result = splitIntoChunks(text, 500)

      expect(result.length).toBeGreaterThan(0)
      expect(result.length).toBeLessThan(20) // Should not create excessive chunks
    })

    it('should handle Japanese text', () => {
      const text = 'これはテストです。' + '日本語の文章です。'.repeat(100)
      const result = splitIntoChunks(text, 500, 100)

      expect(result.length).toBeGreaterThan(0)
      result.forEach(chunk => {
        expect(chunk).toMatch(/[ぁ-んァ-ヶー一-龠]/)
      })
    })

    it('should handle special characters', () => {
      const text = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`'
      const result = splitIntoChunks(text, 1000)

      expect(result[0]).toBe(text)
    })

    it('should handle emojis', () => {
      const text = '🌍 🔥 💧 🌿 ' + 'Test with emojis. '.repeat(100)
      const result = splitIntoChunks(text, 500)

      expect(result.length).toBeGreaterThan(0)
      expect(result.some(chunk => chunk.includes('🌍'))).toBe(true)
    })

    it('should not create empty chunks', () => {
      const text = 'Word. '.repeat(500)
      const result = splitIntoChunks(text, 500, 100)

      result.forEach(chunk => {
        expect(chunk.length).toBeGreaterThan(0)
        expect(chunk.trim().length).toBeGreaterThan(0)
      })
    })

    it('should handle zero overlap', () => {
      const text = 'A'.repeat(2000)
      const result = splitIntoChunks(text, 500, 0)

      expect(result.length).toBeGreaterThan(1)
    })

    it('should handle large overlap', () => {
      const text = 'A'.repeat(2000)
      const result = splitIntoChunks(text, 500, 400)

      expect(result.length).toBeGreaterThan(1)
    })
  })

  describe('addContextualHeaders', () => {
    beforeEach(() => {
      vi.spyOn(console, 'log').mockImplementation(() => {})
    })

    it('should return chunks unchanged for simple text without headers', () => {
      const originalText = 'Simple text without any headers.'
      const chunks = [originalText]
      const result = addContextualHeaders(chunks, originalText)

      expect(result).toEqual(chunks)
    })

    it('should add h2 context to chunks', () => {
      const originalText = `
## Section Title
Content for this section.
More content here.
      `.trim()

      const chunks = ['Content for this section.', 'More content here.']
      const result = addContextualHeaders(chunks, originalText)

      expect(result[0]).toContain('## Section Title')
      expect(result[1]).toContain('## Section Title')
    })

    it('should add h2 and h3 context to chunks', () => {
      const originalText = `
## Main Section
### Subsection
Content here.
      `.trim()

      const chunks = ['Content here.']
      const result = addContextualHeaders(chunks, originalText)

      expect(result[0]).toContain('## Main Section')
      expect(result[0]).toContain('### Subsection')
    })

    it('should not duplicate headers if chunk already starts with heading', () => {
      const originalText = `
## Section 1
Content.

## Section 2
More content.
      `.trim()

      const chunks = ['## Section 2\nMore content.']
      const result = addContextualHeaders(chunks, originalText)

      // Should not add duplicate heading
      const headerCount = (result[0].match(/## Section 2/g) || []).length
      expect(headerCount).toBe(1)
    })

    it('should handle multiple chunks with different contexts', () => {
      const originalText = `
## Section 1
### Subsection 1.1
Content 1.

## Section 2
### Subsection 2.1
Content 2.
      `.trim()

      const chunks = ['Content 1.', 'Content 2.']
      const result = addContextualHeaders(chunks, originalText)

      expect(result[0]).toContain('## Section 1')
      expect(result[0]).toContain('### Subsection 1.1')

      expect(result[1]).toContain('## Section 2')
      expect(result[1]).toContain('### Subsection 2.1')
    })

    it('should handle h1, h2, h3 hierarchy', () => {
      const originalText = `
# Main Title
## Section
### Subsection
Content here.
      `.trim()

      const chunks = ['Content here.']
      const result = addContextualHeaders(chunks, originalText)

      // Should add h2 and h3 (not h1)
      expect(result[0]).toContain('## Section')
      expect(result[0]).toContain('### Subsection')
      expect(result[0]).not.toContain('# Main Title')
    })

    it('should skip contextual headers for very large documents', () => {
      const largeText = 'A'.repeat(150000)
      const chunks = ['chunk1', 'chunk2']

      const result = addContextualHeaders(chunks, largeText)

      expect(result).toEqual(chunks)
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Skipping for large document')
      )
    })

    it('should skip for documents with many chunks', () => {
      const chunks = Array(350).fill('chunk')
      const originalText = chunks.join('\n')

      const result = addContextualHeaders(chunks, originalText)

      expect(result).toEqual(chunks)
      expect(console.log).toHaveBeenCalled()
    })

    it('should handle empty chunks array', () => {
      const originalText = '## Section\nContent'
      const result = addContextualHeaders([], originalText)

      expect(result).toEqual([])
    })

    it('should handle chunks not found in original text', () => {
      const originalText = 'Original text'
      const chunks = ['Different text']

      const result = addContextualHeaders(chunks, originalText)

      expect(result).toEqual(chunks)
    })

    it('should handle complex markdown document', () => {
      const originalText = `
# Document Title

## Introduction
This is the intro.

## Main Content
### Part 1
Content for part 1.

### Part 2
Content for part 2.

## Conclusion
Final thoughts.
      `.trim()

      const chunks = [
        'Content for part 1.',
        'Content for part 2.',
        'Final thoughts.',
      ]

      const result = addContextualHeaders(chunks, originalText)

      expect(result[0]).toContain('## Main Content')
      expect(result[0]).toContain('### Part 1')

      expect(result[1]).toContain('## Main Content')
      expect(result[1]).toContain('### Part 2')

      expect(result[2]).toContain('## Conclusion')
    })

    it('should handle headings with special characters', () => {
      const originalText = `
## Section: Test (with special chars!)
### Sub-section #1
Content here.
      `.trim()

      const chunks = ['Content here.']
      const result = addContextualHeaders(chunks, originalText)

      expect(result[0]).toContain('## Section: Test (with special chars!)')
      expect(result[0]).toContain('### Sub-section #1')
    })

    it('should handle sequential optimization', () => {
      const originalText = `
## Section 1
Content 1.

## Section 2
Content 2.

## Section 3
Content 3.
      `.trim()

      const chunks = ['Content 1.', 'Content 2.', 'Content 3.']
      const result = addContextualHeaders(chunks, originalText)

      // All chunks should have appropriate headers
      expect(result[0]).toContain('## Section 1')
      expect(result[1]).toContain('## Section 2')
      expect(result[2]).toContain('## Section 3')
    })
  })

  describe('estimateTokenCount', () => {
    it('should estimate tokens for short text', () => {
      const text = 'Hello'
      const tokenCount = estimateTokenCount(text)

      expect(tokenCount).toBe(Math.ceil(5 / 4))
      expect(tokenCount).toBe(2)
    })

    it('should estimate tokens for longer text', () => {
      const text = 'This is a longer text for testing.'
      const tokenCount = estimateTokenCount(text)

      expect(tokenCount).toBe(Math.ceil(text.length / 4))
    })

    it('should handle empty string', () => {
      const tokenCount = estimateTokenCount('')

      expect(tokenCount).toBe(0)
    })

    it('should use ~4 characters per token estimate', () => {
      const text = 'A'.repeat(100)
      const tokenCount = estimateTokenCount(text)

      expect(tokenCount).toBe(25)
    })

    it('should round up', () => {
      const text = 'ABC' // 3 chars
      const tokenCount = estimateTokenCount(text)

      expect(tokenCount).toBe(1) // 3/4 = 0.75, rounds up to 1
    })

    it('should handle unicode characters', () => {
      const text = 'こんにちは' // 5 Japanese characters
      const tokenCount = estimateTokenCount(text)

      expect(tokenCount).toBeGreaterThan(0)
      expect(tokenCount).toBe(Math.ceil(text.length / 4))
    })

    it('should handle emojis', () => {
      const text = '🌍🔥💧🌿'
      const tokenCount = estimateTokenCount(text)

      expect(tokenCount).toBeGreaterThan(0)
    })

    it('should be consistent', () => {
      const text = 'Consistent text'
      const count1 = estimateTokenCount(text)
      const count2 = estimateTokenCount(text)

      expect(count1).toBe(count2)
    })

    it('should handle very long text', () => {
      const text = 'A'.repeat(10000)
      const tokenCount = estimateTokenCount(text)

      expect(tokenCount).toBe(2500)
    })
  })

  describe('Integration: splitIntoChunks + addContextualHeaders', () => {
    it('should work together for markdown document', () => {
      const originalText = `
## Introduction
This is a long introduction. ${'More text. '.repeat(100)}

## Main Content
### Section 1
Content for section 1. ${'Additional content. '.repeat(100)}

### Section 2
Content for section 2. ${'More content. '.repeat(100)}

## Conclusion
Final thoughts.
      `.trim()

      const chunks = splitIntoChunks(originalText, 500, 100)
      const chunksWithContext = addContextualHeaders(chunks, originalText)

      expect(chunks.length).toBeGreaterThan(1)
      expect(chunksWithContext.length).toBe(chunks.length)

      // Check that context is added
      chunksWithContext.forEach(chunk => {
        expect(chunk.length).toBeGreaterThan(0)
        // Most chunks should have some header context
      })
    })

    it('should maintain searchability across chunks', () => {
      const originalText = `
## API Documentation
### Authentication
Use Bearer tokens for authentication.

### Endpoints
Available endpoints are listed below.
      `.trim()

      const chunks = splitIntoChunks(originalText, 200, 50)
      const chunksWithContext = addContextualHeaders(chunks, originalText)

      // Each chunk should be searchable with context
      chunksWithContext.forEach(chunk => {
        if (chunk.includes('Bearer tokens')) {
          expect(chunk).toContain('## API Documentation')
          expect(chunk).toContain('### Authentication')
        }
      })
    })
  })

  describe('Edge cases and performance', () => {
    it('should handle document with no content', () => {
      const chunks = splitIntoChunks('\n\n\n', 1000)

      expect(chunks).toEqual([])
    })

    it('should handle single very long line', () => {
      const text = 'Word'.repeat(1000)
      const result = splitIntoChunks(text, 500)

      expect(result.length).toBeGreaterThan(0)
    })

    it('should complete in reasonable time for large document', () => {
      const text = 'Sentence. '.repeat(2000) // ~20,000 chars
      const start = Date.now()

      const result = splitIntoChunks(text, 1000, 200)

      const duration = Date.now() - start

      expect(result.length).toBeGreaterThan(0)
      expect(duration).toBeLessThan(2000) // Should complete within 2 seconds
    })
  })
})
