/**
 * Splits text into chunks of approximately equal size
 * @param text - Text to split
 * @param chunkSize - Target size of each chunk (default: 1000)
 * @param overlap - Number of characters to overlap between chunks (default: 200)
 * @returns Array of text chunks
 */
export function splitIntoChunks(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): string[] {
  if (!text || text.trim().length === 0) {
    return []
  }

  // Normalize whitespace (preserve line breaks for structure)
  // Only compress multiple spaces/tabs on the same line, but keep newlines
  const normalizedText = text
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
    .trim()

  if (normalizedText.length <= chunkSize) {
    return [normalizedText]
  }

  const chunks: string[] = []
  let startIndex = 0

  while (startIndex < normalizedText.length) {
    let endIndex = startIndex + chunkSize

    // If this is not the last chunk, try to end at a logical boundary
    if (endIndex < normalizedText.length) {
      // 1. Try to end at a markdown heading (highest priority for structured documents)
      const headingEnd = findMarkdownHeading(normalizedText, endIndex, startIndex)
      if (headingEnd !== -1) {
        endIndex = headingEnd
      } else {
        // 2. Look for sentence endings (., !, ?, \n)
        const sentenceEnd = findSentenceEnd(normalizedText, endIndex, startIndex)
        if (sentenceEnd !== -1) {
          endIndex = sentenceEnd
        } else {
          // 3. If no sentence end found, try to end at a word boundary
          const wordEnd = findWordBoundary(normalizedText, endIndex, startIndex)
          if (wordEnd !== -1) {
            endIndex = wordEnd
          }
        }
      }
    }

    const chunk = normalizedText.slice(startIndex, endIndex).trim()
    if (chunk.length > 0) {
      chunks.push(chunk)
    }

    // Move start index forward, accounting for overlap
    startIndex = endIndex - overlap

    // Prevent infinite loop: if we're not making progress, break
    if (startIndex >= normalizedText.length || endIndex >= normalizedText.length) {
      break
    }
  }

  return chunks
}

/**
 * Finds the nearest markdown heading before the target index
 * Prioritizes splitting at section boundaries (## or ###)
 */
function findMarkdownHeading(text: string, targetIndex: number, minIndex: number): number {
  // Look for markdown headings: lines starting with ## or ###
  const lines = text.substring(0, targetIndex).split('\n')

  for (let i = lines.length - 1; i >= 0; i--) {
    const lineStart = lines.slice(0, i).join('\n').length + (i > 0 ? 1 : 0)

    if (lineStart <= minIndex) {
      break
    }

    const line = lines[i].trim()
    if (line.match(/^#{1,3}\s+/)) {
      // Found a heading, return position at start of this line
      return lineStart
    }
  }

  return -1
}

/**
 * Finds the nearest sentence ending before the target index
 */
function findSentenceEnd(text: string, targetIndex: number, minIndex: number): number {
  const sentenceEndings = /[.!?\n]/g
  let match
  let lastMatch = -1

  while ((match = sentenceEndings.exec(text)) !== null) {
    if (match.index >= targetIndex) {
      break
    }
    if (match.index > minIndex) {
      lastMatch = match.index + 1
    }
  }

  return lastMatch
}

/**
 * Finds the nearest word boundary before the target index
 */
function findWordBoundary(text: string, targetIndex: number, minIndex: number): number {
  for (let i = targetIndex; i > minIndex; i--) {
    if (/\s/.test(text[i])) {
      return i
    }
  }
  return -1
}

/**
 * Adds contextual headers to chunks for better semantic understanding
 * Prepends parent section headings (##, ###) to each chunk
 *
 * @param chunks - Array of text chunks
 * @param originalText - Original full text before chunking
 * @returns Array of chunks with contextual headers prepended
 */
export function addContextualHeaders(chunks: string[], originalText: string): string[] {
  // For very large documents (>100k chars), skip contextual headers to avoid performance issues
  if (originalText.length > 100000 || chunks.length > 300) {
    console.log('[addContextualHeaders] Skipping for large document to avoid performance issues')
    return chunks
  }

  // Pre-process: extract all headings from original text with their positions
  const lines = originalText.split('\n')
  const headings: Array<{ level: number; text: string; position: number }> = []
  let position = 0

  for (const line of lines) {
    const trimmedLine = line.trim()
    const h1Match = trimmedLine.match(/^#\s+(.+)/)
    const h2Match = trimmedLine.match(/^##\s+(.+)/)
    const h3Match = trimmedLine.match(/^###\s+(.+)/)

    if (h3Match) {
      headings.push({ level: 3, text: h3Match[1], position })
    } else if (h2Match) {
      headings.push({ level: 2, text: h2Match[1], position })
    } else if (h1Match) {
      headings.push({ level: 1, text: h1Match[1], position })
    }

    position += line.length + 1 // +1 for newline
  }

  // Process chunks with improved performance
  let searchStartPos = 0
  return chunks.map(chunk => {
    // Find chunk position starting from last position (sequential search optimization)
    const chunkIndex = originalText.indexOf(chunk, searchStartPos)
    if (chunkIndex === -1) {
      return chunk
    }
    searchStartPos = chunkIndex + 1

    // Find the most recent headings before this chunk
    let h1: string | null = null
    let h2: string | null = null
    let h3: string | null = null

    for (let i = headings.length - 1; i >= 0; i--) {
      const heading = headings[i]
      if (heading.position >= chunkIndex) continue

      if (heading.level === 3 && !h3) {
        h3 = heading.text
      } else if (heading.level === 2 && !h2) {
        h2 = heading.text
      } else if (heading.level === 1 && !h1) {
        h1 = heading.text
      }

      if (h1 && h2 && h3) break
    }

    // Check if chunk already starts with a heading
    const chunkStartsWithHeading = chunk.trim().match(/^#{1,3}\s+/)

    // Build contextual header
    let contextualHeader = ''

    if (!chunkStartsWithHeading) {
      if (h2) {
        contextualHeader += `## ${h2}\n`
      }
      if (h3) {
        contextualHeader += `### ${h3}\n`
      }
      if (contextualHeader) {
        contextualHeader += '\n'
      }
    }

    return contextualHeader + chunk
  })
}

/**
 * Counts the number of tokens in text (rough approximation)
 * OpenAI uses ~4 characters per token as a rough estimate
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4)
}
