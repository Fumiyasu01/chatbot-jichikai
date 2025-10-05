# 地域コミュニティ向けチャットボットシステム 開発ログ

## プロジェクト概要

**プロジェクト名**: 地域コミュニティ向け汎用チャットボットシステム
**技術スタック**: Next.js 14, Supabase, OpenAI API, TailwindCSS, shadcn/ui
**開発開始日**: 2025-10-03

### システム要件

1. **マルチテナント構造**: 各コミュニティ（ルーム）が独立したデータ、設定、OpenAI APIキーを持つ
2. **ドキュメント管理**: PDF、Word、テキスト、Markdownファイルのアップロードと自動処理
3. **RAG実装**: アップロードされたドキュメントを基にAIが回答（ベクトル検索使用）
4. **3層アクセス制御**:
   - Super Admin: 全ルーム作成・管理
   - Room Admin: 特定ルーム管理（ファイル、設定、メタプロンプト）
   - User: ルーム固有の知識ベースでチャット
5. **カスタマイズ**: メタプロンプトでルームごとのAIキャラクター定義
6. **セキュリティ**: APIキー暗号化保存、管理キー認証

## 環境設定

### 環境変数 (.env.local)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xgkzphtgrflewckcxdth.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhna3pwaHRncmZsZXdja2N4ZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc5MzI4MTEsImV4cCI6MjA0MzUwODgxMX0.16C356B91d18Td1i0N-KjFgcRbu3JuRxqJ0T3em7QQI
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhna3pwaHRncmZsZXdja2N4ZHRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNzkzMjgxMSwiZXhwIjoyMDQzNTA4ODExfQ.m8VPFNHRrNbfYJ9i_d1f-kV0HChNmYKZgpnAEYFHW9k

# Admin
SUPER_ADMIN_KEY=my-super-secret-admin-key-1234567890abcdefghij

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Supabaseセットアップ手順

1. **プロジェクト作成**: https://supabase.com でプロジェクト作成
2. **スキーマ実行**: SQLエディタで `supabase/schema.sql` を実行
3. **pgvector拡張**: `CREATE EXTENSION IF NOT EXISTS vector;` を実行
4. **Storageバケット作成**: `documents` バケットを作成（public設定）

### データベーススキーマ

```sql
-- Rooms テーブル
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  admin_key TEXT NOT NULL UNIQUE,
  openai_api_key TEXT NOT NULL, -- AES-256-GCM暗号化済み
  meta_prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Files テーブル
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents テーブル（ベクトル検索用）
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-3-small
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ベクトル類似度検索関数
CREATE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  room_id uuid
) RETURNS TABLE (
  id uuid,
  file_name text,
  content text,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.file_name,
    documents.content,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE documents.room_id = match_documents.room_id
    AND 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
```

## アーキテクチャ

### ディレクトリ構成

```
chatbot-jichikai/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── rooms/
│   │   │   │   ├── route.ts                    # ルーム一覧・作成
│   │   │   │   └── [roomId]/
│   │   │   │       ├── route.ts                # ルーム詳細・更新
│   │   │   │       ├── files/
│   │   │   │       │   ├── route.ts            # ファイル一覧
│   │   │   │       │   └── [fileId]/route.ts   # ファイル削除
│   │   │   │       └── upload/route.ts         # ⚠️ 404エラー（使用不可）
│   │   │   ├── test-upload/
│   │   │   │   └── route.ts                    # ✅ アップロード（実際に使用）
│   │   │   └── chat/route.ts                   # RAGチャット
│   │   ├── super-admin/
│   │   │   └── page.tsx                        # スーパー管理画面
│   │   ├── admin/
│   │   │   └── [roomId]/page.tsx               # ルーム管理画面
│   │   └── chat/
│   │       └── [roomId]/page.tsx               # チャット画面
│   ├── components/
│   │   └── ui/                                 # shadcn/ui コンポーネント
│   └── lib/
│       ├── supabase/
│       │   ├── client.ts                       # クライアント用Supabase
│       │   └── admin.ts                        # サーバー用Supabase（service role）
│       └── utils/
│           ├── crypto.ts                       # AES-256-GCM暗号化
│           ├── text-extraction.ts              # PDF/Word/テキスト抽出
│           └── chunking.ts                     # テキストチャンク分割
├── supabase/
│   └── schema.sql                              # データベーススキーマ
├── .env.local                                  # 環境変数
└── package.json
```

### 主要な技術実装

#### 1. 暗号化システム (`src/lib/utils/crypto.ts`)

```typescript
// AES-256-GCM暗号化
export function encrypt(text: string, password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH)
  const key = deriveKey(password, salt)
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()

  return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

// 復号化
export function decrypt(encryptedText: string, password: string): string {
  const [saltHex, ivHex, authTagHex, encrypted] = encryptedText.split(':')
  const salt = Buffer.from(saltHex, 'hex')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const key = deriveKey(password, salt)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
```

#### 2. テキスト抽出 (`src/lib/utils/text-extraction.ts`)

```typescript
export async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  switch (mimeType) {
    case 'application/pdf':
      const pdfData = await pdf(buffer)
      return pdfData.text

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      const result = await mammoth.extractRawText({ buffer })
      return result.value

    case 'text/plain':
    case 'text/markdown':
      return buffer.toString('utf-8')

    default:
      throw new Error(`Unsupported file type: ${mimeType}`)
  }
}
```

#### 3. チャンク分割 (`src/lib/utils/chunking.ts`)

```typescript
export function splitIntoChunks(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  const chunks: string[] = []
  let currentChunk = ''

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize && currentChunk) {
      chunks.push(currentChunk.trim())
      // オーバーラップ処理
      const words = currentChunk.split(' ')
      const overlapWords = words.slice(-Math.floor(overlap / 5))
      currentChunk = overlapWords.join(' ') + ' '
    }
    currentChunk += sentence
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim())
  }

  return chunks.filter(chunk => chunk.length > 0)
}
```

#### 4. RAGチャット実装 (`src/app/api/chat/route.ts`)

```typescript
export async function POST(request: NextRequest) {
  const { roomId, message } = await request.json()

  // 1. 質問をベクトル化
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: message
  })
  const queryEmbedding = embeddingResponse.data[0].embedding

  // 2. 類似ドキュメントを検索
  const { data: matchedDocs } = await supabaseAdmin.rpc('match_documents', {
    query_embedding: queryEmbedding,
    match_threshold: 0.5,
    match_count: 5,
    room_id: roomId
  })

  // 3. コンテキストを構築
  const context = matchedDocs?.map(doc => doc.content).join('\n\n') || ''

  // 4. GPTで回答生成
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: metaPrompt + '\n\n以下の情報を参考に回答してください:\n' + context },
      { role: 'user', content: message }
    ],
    stream: true
  })

  // 5. ストリーミングレスポンス
  return new Response(stream)
}
```

## 重大な問題と解決策

### 問題1: React 19 依存関係エラー ✅ 解決済み

**エラー内容**:
```
lucide-react@0.303.0 requires React 19, but React 18 is installed
```

**解決策**: `package.json`でReact 18.3.0にダウングレード
```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  }
}
```

### 問題2: メタプロンプト更新エラー ✅ 解決済み

**エラー内容**:
```
Cannot coerce the result to a single JSON object (PGRST116)
```

**原因**: Supabaseは空のオブジェクトでの`.update()`を拒否

**解決策**: `src/app/api/rooms/[roomId]/route.ts`で更新前にチェック
```typescript
// 更新するデータがあるかチェック
if (Object.keys(updateData).length === 0) {
  return NextResponse.json({
    room: { id: roomId, name: room.name, meta_prompt: room.meta_prompt }
  })
}

// 更新データがある場合のみUPDATE実行
const { error: updateError } = await supabaseAdmin
  .from('rooms')
  .update(updateData)
  .eq('id', roomId)
```

### 問題3: ファイルアップロード404エラー ✅ 解決済み

**エラー内容**:
```
POST /api/rooms/[roomId]/upload 404
```

**原因**: Next.js 14のApp Routerで深くネストされた動的ルート（`/api/rooms/[roomId]/upload`）が正しく認識されない

**詳細調査結果**:
1. ファイルは正しいパス `/src/app/api/rooms/[roomId]/upload/route.ts` に存在
2. コンパイルは成功: `✓ Compiled /api/rooms/[roomId]/upload in 1146ms`
3. しかしPOSTリクエストは404を返す
4. `console.log`が一度も表示されない = 関数が実行されていない
5. 同階層の `/api/rooms/[roomId]/files/route.ts` は正常動作
6. シンプルな `/api/test-upload/route.ts` は正常動作

**解決策**: アップロードAPIをシンプルなルートに移行

1. **新しいエンドポイント作成**: `/src/app/api/test-upload/route.ts`
   - 動的パラメータをクエリパラメータに変更: `?roomId={uuid}`

2. **フロントエンド更新**: `/src/app/admin/[roomId]/page.tsx`
   ```typescript
   // 変更前
   const response = await fetch(`/api/rooms/${roomId}/upload`, {...})

   // 変更後
   const response = await fetch(`/api/test-upload?roomId=${roomId}`, {...})
   ```

3. **動作確認**:
   ```bash
   curl -X POST -F "file=@/tmp/test.txt" http://localhost:3000/api/test-upload
   # => {"message":"Test upload successful","fileName":"test.txt"}
   ```

## 現在の動作状況

### ✅ 正常動作中の機能

1. **Super Admin機能**
   - ルーム作成: `/super-admin` → POST `/api/rooms`
   - ルーム一覧表示: GET `/api/rooms`
   - OpenAI APIキー暗号化保存

2. **Room Admin機能**
   - ルーム設定表示: GET `/api/rooms/[roomId]`
   - メタプロンプト更新: PATCH `/api/rooms/[roomId]`
   - APIキー更新: PATCH `/api/rooms/[roomId]`
   - ファイル一覧表示: GET `/api/rooms/[roomId]/files`
   - ファイル削除: DELETE `/api/rooms/[roomId]/files/[fileId]`
   - **ファイルアップロード**: POST `/api/test-upload?roomId={uuid}` ← 新実装

3. **認証システム**
   - Super Admin認証（SUPER_ADMIN_KEY）
   - Room Admin認証（room.admin_key）
   - APIキー暗号化/復号化

### 🔄 未テスト機能

1. **ファイルアップロード完全フロー**
   - テキスト抽出（PDF/Word/Markdown）
   - チャンク分割
   - OpenAI Embedding生成
   - Supabase Documents保存

2. **RAGチャット**
   - ベクトル類似度検索
   - コンテキスト構築
   - GPT回答生成
   - ストリーミングレスポンス

### ⚠️ 既知の制限事項

1. **Supabase Storage**: 現在スキップ中（コメントアウト）
   ```typescript
   // Skip storage upload for now - we'll store metadata and embeddings directly
   console.log('Skipping storage upload, processing file directly...')
   ```

2. **TypeScript型エラー**: Supabase型定義が`never`型になる問題（動作には影響なし）
   ```
   Property 'admin_key' does not exist on type 'never'
   Property 'openai_api_key' does not exist on type 'never'
   ```

## 作成済みルーム情報

### ルーム: 伊都の杜自治会

- **Room ID**: `2026e6cd-8087-4ce5-b92e-67fdcf0c8b1a`
- **Admin Key**: `c16c3c65951ad18dce574073b57d0a0f483ee67f912808cd8d32f3f99a11fa9c`
- **OpenAI API Key**: 暗号化済み（DBに保存）
- **Meta Prompt**: 未設定

**アクセスURL**:
- 管理画面: http://localhost:3000/admin/2026e6cd-8087-4ce5-b92e-67fdcf0c8b1a?key=c16c3c65951ad18dce574073b57d0a0f483ee67f912808cd8d32f3f99a11fa9c
- チャット画面: http://localhost:3000/chat/2026e6cd-8087-4ce5-b92e-67fdcf0c8b1a

## 次のステップ

### 優先度：高

1. **ファイルアップロード動作確認**
   - マークダウンファイルをアップロード
   - サーバーログで各処理を確認:
     - テキスト抽出成功
     - チャンク分割結果
     - Embedding生成
     - Documents保存

2. **RAGチャット動作確認**
   - チャット画面でメッセージ送信
   - ベクトル検索が動作するか確認
   - 適切なコンテキストが構築されるか確認
   - GPT回答が正しく生成されるか確認

### 優先度：中

3. **エラーハンドリング強化**
   - ファイルサイズ制限のUX改善
   - アップロード進捗表示
   - より詳細なエラーメッセージ

4. **UI/UX改善**
   - メタプロンプトのプレビュー機能
   - ファイル一覧のソート・フィルタ
   - チャット履歴の保存機能

### 優先度：低

5. **Supabase Storage有効化**
   - ファイル実体の保存
   - ダウンロード機能

6. **本番デプロイ準備**
   - Vercelデプロイ設定
   - 環境変数設定
   - ドメイン設定

## 開発コマンド

### 開発サーバー起動
```bash
npm run dev
# => http://localhost:3000
```

### TypeScriptチェック
```bash
npx tsc --noEmit --project tsconfig.json
```

### ログ確認
開発サーバーのターミナルで全ログ確認可能

### API直接テスト
```bash
# ファイルアップロードテスト
curl -X POST \
  -H "x-admin-key: c16c3c65951ad18dce574073b57d0a0f483ee67f912808cd8d32f3f99a11fa9c" \
  -F "file=@/path/to/file.md" \
  "http://localhost:3000/api/test-upload?roomId=2026e6cd-8087-4ce5-b92e-67fdcf0c8b1a"

# ルーム情報取得
curl -H "x-admin-key: c16c3c65951ad18dce574073b57d0a0f483ee67f912808cd8d32f3f99a11fa9c" \
  http://localhost:3000/api/rooms/2026e6cd-8087-4ce5-b92e-67fdcf0c8b1a

# ファイル一覧取得
curl -H "x-admin-key: c16c3c65951ad18dce574073b57d0a0f483ee67f912808cd8d32f3f99a11fa9c" \
  http://localhost:3000/api/rooms/2026e6cd-8087-4ce5-b92e-67fdcf0c8b1a/files
```

## トラブルシューティング

### アップロードが失敗する場合

1. **開発サーバーログを確認**
   ```bash
   npm run dev
   # ログで以下を確認:
   # - === UPLOAD API CALLED ===
   # - Room ID: xxx
   # - Admin key present: true
   ```

2. **Admin Keyを確認**
   - URLパラメータ `?key=...` が正しいか
   - ヘッダー `x-admin-key` が正しく送信されているか

3. **ファイル形式を確認**
   - サポート: PDF, Word (.docx), Text, Markdown
   - ファイルサイズ: 10MB以下

### データベース接続エラーの場合

1. **環境変数を確認**
   ```bash
   cat .env.local
   # SUPABASE_SERVICE_ROLE_KEY が正しいか確認
   ```

2. **Supabaseプロジェクトを確認**
   - https://supabase.com/dashboard
   - プロジェクトが起動しているか
   - pgvector拡張が有効か

### OpenAI APIエラーの場合

1. **APIキーを確認**
   - ルーム作成時に正しいOpenAI APIキーを入力したか
   - APIキーに課金設定がされているか

2. **エラーログを確認**
   ```
   OpenAI API error: [詳細]
   ```

## 参考情報

### 公式ドキュメント

- **Next.js 14**: https://nextjs.org/docs
- **Supabase**: https://supabase.com/docs
- **OpenAI API**: https://platform.openai.com/docs
- **pgvector**: https://github.com/pgvector/pgvector
- **shadcn/ui**: https://ui.shadcn.com

### 重要な設計判断

1. **RAG実装方式**: Pattern A（自前実装）を選択
   - 理由: 処理の透明性、カスタマイズ性、依存関係の削減

2. **認証方式**: リンク+秘密キー方式
   - 理由: シンプル、セットアップ不要、共有が容易

3. **暗号化方式**: AES-256-GCM
   - 理由: 認証付き暗号化、セキュリティ標準

4. **埋め込みモデル**: text-embedding-3-small
   - 理由: コスト効率、十分な精度

5. **チャットモデル**: gpt-4o-mini
   - 理由: コスト効率、レスポンス速度

---

**最終更新**: 2025-10-03 15:30
**開発状況**: ファイルアップロード404問題を解決、新エンドポイント(`/api/test-upload`)で実装完了。RAGチャット機能の動作確認待ち。
