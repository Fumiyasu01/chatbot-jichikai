/**
 * Internal type for chunks with position metadata
 * Used to track chunk locations in the original normalized text
 */
interface ChunkWithPosition {
  /** The chunk text content */
  text: string
  /** Starting position in the normalized text */
  startPos: number
  /** Ending position in the normalized text */
  endPos: number
}

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
 * Internal function: Splits text into chunks with position information
 * This is used internally by addContextualHeaders for performance optimization
 * @param text - Text to split
 * @param chunkSize - Target size of each chunk
 * @param overlap - Number of characters to overlap between chunks
 * @returns Array of chunks with position metadata
 */
function splitIntoChunksWithPositions(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): ChunkWithPosition[] {
  if (!text || text.trim().length === 0) {
    return []
  }

  const normalizedText = text
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (normalizedText.length <= chunkSize) {
    return [{ text: normalizedText, startPos: 0, endPos: normalizedText.length }]
  }

  const chunks: ChunkWithPosition[] = []
  let startIndex = 0

  while (startIndex < normalizedText.length) {
    let endIndex = startIndex + chunkSize

    if (endIndex < normalizedText.length) {
      const headingEnd = findMarkdownHeading(normalizedText, endIndex, startIndex)
      if (headingEnd !== -1) {
        endIndex = headingEnd
      } else {
        const sentenceEnd = findSentenceEnd(normalizedText, endIndex, startIndex)
        if (sentenceEnd !== -1) {
          endIndex = sentenceEnd
        } else {
          const wordEnd = findWordBoundary(normalizedText, endIndex, startIndex)
          if (wordEnd !== -1) {
            endIndex = wordEnd
          }
        }
      }
    }

    const chunk = normalizedText.slice(startIndex, endIndex).trim()
    if (chunk.length > 0) {
      chunks.push({
        text: chunk,
        startPos: startIndex,
        endPos: endIndex,
      })
    }

    startIndex = endIndex - overlap

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
 * Internal type for heading metadata
 * Used to track heading positions in the original text
 */
interface HeadingInfo {
  /** Heading level (1, 2, or 3) */
  level: number
  /** Heading text content (without # markers) */
  text: string
  /** Position in the normalized text */
  position: number
}

/**
 * Extracts all headings from text with their positions
 * @param text - Text to extract headings from
 * @returns Array of heading metadata
 */
function extractHeadings(text: string): HeadingInfo[] {
  const lines = text.split('\n')
  const headings: HeadingInfo[] = []
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

  return headings
}

/**
 * Finds the most recent headings before a given position
 * @param headings - Array of heading metadata
 * @param position - Position to search before
 * @returns Object containing h1, h2, and h3 heading texts (or null)
 */
function findPrecedingHeadings(
  headings: HeadingInfo[],
  position: number
): { h1: string | null; h2: string | null; h3: string | null } {
  let h1: string | null = null
  let h2: string | null = null
  let h3: string | null = null

  // Iterate backwards to find the most recent headings
  for (let i = headings.length - 1; i >= 0; i--) {
    const heading = headings[i]
    if (heading.position >= position) continue

    if (heading.level === 3 && !h3) {
      h3 = heading.text
    } else if (heading.level === 2 && !h2) {
      h2 = heading.text
    } else if (heading.level === 1 && !h1) {
      h1 = heading.text
    }

    // Early exit if all heading levels are found
    if (h1 && h2 && h3) break
  }

  return { h1, h2, h3 }
}

/**
 * Builds contextual header string from heading information
 * @param h2 - Level 2 heading text (or null)
 * @param h3 - Level 3 heading text (or null)
 * @param chunkStartsWithHeading - Whether the chunk already starts with a heading
 * @returns Contextual header string
 */
function buildContextualHeader(
  h2: string | null,
  h3: string | null,
  chunkStartsWithHeading: boolean
): string {
  if (chunkStartsWithHeading) {
    return ''
  }

  let contextualHeader = ''
  if (h2) {
    contextualHeader += `## ${h2}\n`
  }
  if (h3) {
    contextualHeader += `### ${h3}\n`
  }
  if (contextualHeader) {
    contextualHeader += '\n'
  }

  return contextualHeader
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
    if (process.env.NODE_ENV === 'development') {
      console.log('[addContextualHeaders] Skipping for large document to avoid performance issues')
    }
    return chunks
  }

  // Normalize the original text the same way splitIntoChunks does
  const normalizedText = originalText
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  // Extract all headings from normalized text with their positions
  const headings = extractHeadings(normalizedText)

  // If there are no headings, return chunks unchanged
  if (headings.length === 0) {
    return chunks
  }

  // Process chunks using indexOf with sequential search optimization
  let searchStartPos = 0
  return chunks.map((chunk, index) => {
    // Find chunk position starting from last position (sequential search optimization)
    const chunkIndex = normalizedText.indexOf(chunk, searchStartPos)

    if (chunkIndex === -1) {
      // Fallback: chunk not found in normalized text
      // This can happen if chunks were created differently or text was modified
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `[addContextualHeaders] Chunk ${index} not found in normalized text. ` +
          `This may indicate a mismatch between chunking and original text. ` +
          `Chunk length: ${chunk.length}, starts with: "${chunk.slice(0, 50)}..."`
        )
      }
      return chunk
    }

    // Update search position for next iteration
    searchStartPos = chunkIndex + 1

    // Find the most recent headings before this chunk
    const { h2, h3 } = findPrecedingHeadings(headings, chunkIndex)

    // Check if chunk already starts with a heading
    const chunkStartsWithHeading = chunk.trim().match(/^#{1,3}\s+/) !== null

    // Build and prepend contextual header
    const contextualHeader = buildContextualHeader(h2, h3, chunkStartsWithHeading)

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
