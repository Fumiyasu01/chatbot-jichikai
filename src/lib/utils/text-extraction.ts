import mammoth from 'mammoth'

/**
 * Extracts text from a PDF file
 * @param buffer - PDF file buffer
 * @returns Extracted text
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import to avoid initialization issues
    const pdf = (await import('pdf-parse')).default
    const data = await pdf(buffer)
    return data.text
  } catch (error) {
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Extracts text from a Word document (.docx)
 * @param buffer - Word file buffer
 * @returns Extracted text
 */
export async function extractTextFromWord(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  } catch (error) {
    throw new Error(`Failed to extract text from Word: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Extracts text from a text file
 * @param buffer - Text file buffer
 * @returns Extracted text
 */
export function extractTextFromPlainText(buffer: Buffer): string {
  try {
    return buffer.toString('utf-8')
  } catch (error) {
    throw new Error(`Failed to extract text from plain text: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Extracts text from a file based on its MIME type and filename
 * @param buffer - File buffer
 * @param mimeType - MIME type of the file
 * @param fileName - Optional filename for extension-based fallback
 * @returns Extracted text
 */
export async function extractText(buffer: Buffer, mimeType: string, fileName?: string): Promise<string> {
  // 拡張子を取得（フォールバック用）
  const ext = fileName?.toLowerCase().split('.').pop()

  // PDF
  if (mimeType === 'application/pdf' || ext === 'pdf') {
    return await extractTextFromPDF(buffer)
  }

  // Word文書
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword' ||
    ext === 'docx' ||
    ext === 'doc'
  ) {
    return await extractTextFromWord(buffer)
  }

  // テキスト・マークダウン（柔軟に対応）
  if (
    mimeType === 'text/plain' ||
    mimeType === 'text/markdown' ||
    mimeType === 'text/x-markdown' ||
    mimeType === 'application/octet-stream' || // ブラウザが判定できない場合のフォールバック
    ext === 'md' ||
    ext === 'markdown' ||
    ext === 'txt'
  ) {
    return extractTextFromPlainText(buffer)
  }

  throw new Error(`Unsupported file type: ${mimeType}${fileName ? ` (${fileName})` : ''}`)
}
