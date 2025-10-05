import { z } from 'zod'

// Room validation schemas
export const createRoomSchema = z.object({
  name: z.string().min(1, 'ルーム名は必須です').max(100, 'ルーム名は100文字以内で入力してください'),
  openai_api_key: z.string().min(1, 'OpenAI APIキーは必須です'),
  meta_prompt: z.string().optional(),
})

export const updateRoomSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  openai_api_key: z.string().min(1).optional(),
  meta_prompt: z.string().optional(),
})

// File upload validation
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'text/markdown',
]

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `ファイルサイズは${MAX_FILE_SIZE / 1024 / 1024}MB以下にしてください`,
    }
  }

  // 拡張子ベースのバリデーション（MIME typeが信頼できない場合のフォールバック）
  const fileName = file.name.toLowerCase()
  const validExtensions = ['.pdf', '.doc', '.docx', '.txt', '.md', '.markdown']
  const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext))

  // MIME type または 拡張子のいずれかが有効であればOK
  if (!ALLOWED_FILE_TYPES.includes(file.type) && !hasValidExtension) {
    return {
      valid: false,
      error: '対応していないファイル形式です。PDF, Word, テキスト, Markdownファイルのみアップロード可能です',
    }
  }

  return { valid: true }
}

// Chat validation
export const chatSchema = z.object({
  message: z.string().min(1, 'メッセージを入力してください').max(2000, 'メッセージは2000文字以内で入力してください'),
  roomId: z.string().uuid('無効なルームIDです'),
})

// Admin key validation
export function validateAdminKey(key: string): boolean {
  return key.length >= 32
}

// OpenAI API key validation (basic check)
export function validateOpenAIKey(key: string): boolean {
  return key.startsWith('sk-') && key.length > 20
}
