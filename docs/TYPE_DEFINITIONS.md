# 型定義ファイル一覧

このドキュメントは、`src/lib/types/` ディレクトリに作成された型定義ファイルの概要を説明します。

## 目的

- プロジェクト全体で使われている型を一箇所に集約
- `any`型を排除し、型安全性を向上
- コードの可読性とメンテナンス性を向上

## ディレクトリ構造

```
src/lib/types/
├── index.ts          # すべての型をre-export（エントリーポイント）
├── database.ts       # Supabase Database型のラッパー
├── room.ts           # Room関連の型
├── file.ts           # File/アップロード関連の型
├── document.ts       # Document/検索関連の型
├── chat.ts           # チャット/メッセージ関連の型
├── auth.ts           # 認証/セッション関連の型
├── usage.ts          # 使用量トラッキング関連の型
└── api.ts            # 汎用API型（エラー、ページネーションなど）
```

## 各ファイルの詳細

### 1. `database.ts` - データベース型

Supabaseの`Database`型から必要な型を抽出し、使いやすい形で再エクスポート。

**主な型:**
- `Room`, `RoomInsert`, `RoomUpdate` - roomsテーブル
- `Document`, `DocumentInsert`, `DocumentUpdate` - documentsテーブル
- `File`, `FileInsert`, `FileUpdate` - filesテーブル
- `ProcessingStatus` - ファイル処理ステータス
- `MatchedDocument` - ベクトル検索結果

**使用例:**
```typescript
import { Room, FileInsert } from '@/lib/types'

const room: Room = {
  id: 'xxx',
  name: 'Sample Room',
  // ...
}
```

### 2. `room.ts` - Room関連型

Room管理のAPI型とUI型。

**主な型:**
- `RoomDisplay` - UIで表示するRoom情報（APIキーはマスク済み）
- `CreateRoomRequest` - Room作成リクエスト
- `UpdateRoomRequest` - Room更新リクエスト
- `CreateRoomResponse` - Room作成レスポンス（URLを含む）
- `RoomListResponse` - Roomリスト取得レスポンス

**使用例:**
```typescript
import { RoomDisplay, UpdateRoomRequest } from '@/lib/types'

const updateRoom = async (data: UpdateRoomRequest) => {
  const response = await fetch('/api/rooms/xxx', {
    method: 'PATCH',
    body: JSON.stringify(data)
  })
}
```

### 3. `file.ts` - File関連型

ファイルアップロードと処理に関する型。

**主な型:**
- `FileMetadata` - アップロードされたファイルのメタ情報
- `FileUploadResponse` - アップロードAPI応答
- `ProcessEmbeddingsRequest` - Embedding処理リクエスト
- `ProcessEmbeddingsResponse` - Embedding処理レスポンス
- `FileProcessingProgress` - 処理進捗情報

**使用例:**
```typescript
import { FileMetadata, FileProcessingProgress } from '@/lib/types'

const [files, setFiles] = useState<FileMetadata[]>([])
const [progress, setProgress] = useState<FileProcessingProgress | null>(null)
```

### 4. `document.ts` - Document関連型

ベクトル検索とドキュメントチャンクに関する型。

**主な型:**
- `DocumentWithSimilarity` - 類似度スコア付きドキュメント
- `DocumentWithHybridScore` - ハイブリッド検索スコア付き
- `DocumentChunk` - ドキュメントチャンク
- `SourceReference` - チャットの参照元情報
- `GroupedSources` - UI表示用にグルーピングされた参照元

**使用例:**
```typescript
import { SourceReference, DocumentWithHybridScore } from '@/lib/types'

const sources: SourceReference[] = [
  { file_name: 'guide.pdf', similarity: 0.85 }
]
```

### 5. `chat.ts` - チャット関連型

チャット機能とOpenAI APIに関する型。

**主な型:**
- `ChatMessage` - チャットメッセージ
- `ChatRequest` - チャットAPIリクエスト
- `ChatResponse` - チャットAPIレスポンス（非ストリーミング）
- `StreamMessage` - ストリーミングメッセージの各種型
  - `StreamMetadataMessage` - メタデータ（参照元）
  - `StreamContentMessage` - コンテンツ（本文）
  - `StreamDoneMessage` - 完了通知
  - `StreamErrorMessage` - エラー
- `OpenAIEmbeddingResponse` - OpenAI Embedding APIレスポンス
- `OpenAIChatCompletionResponse` - OpenAI Chat APIレスポンス

**使用例:**
```typescript
import { ChatMessage, StreamMessage } from '@/lib/types'

const [messages, setMessages] = useState<ChatMessage[]>([])

// ストリーミング処理
const handleStreamMessage = (msg: StreamMessage) => {
  if (msg.type === 'content') {
    // コンテンツを追加
  }
}
```

### 6. `auth.ts` - 認証関連型

認証、セッション管理に関する型。

**主な型:**
- `SessionData` - セッション情報
- `AuthResult` - 認証結果
- `LoginRequest` - ログインリクエスト
- `LoginResponse` - ログインレスポンス
- `SessionResponse` - セッション確認レスポンス

**使用例:**
```typescript
import { SessionData, LoginRequest } from '@/lib/types'

const login = async (credentials: LoginRequest) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  })
}
```

### 7. `usage.ts` - 使用量トラッキング型

OpenAI API使用量の記録と集計に関する型。

**主な型:**
- `UsageEventType` - イベント種別（'chat', 'upload', 'embedding'）
- `UsageLogParams` - 使用量記録パラメータ
- `UsageSummary` - 使用量サマリー
- `UsageLogEntry` - 使用量ログエントリ
- `UsageResponse` - 使用量API応答
- `ModelPricing` - モデル価格設定
- `PricingConfig` - 価格設定全体

**使用例:**
```typescript
import { UsageSummary, UsageLogParams } from '@/lib/types'

const [usage, setUsage] = useState<UsageSummary | null>(null)

await logUsage({
  roomId: 'xxx',
  eventType: 'chat',
  tokensUsed: 150
} as UsageLogParams)
```

### 8. `api.ts` - 汎用API型

API全般で使用する汎用的な型。

**主な型:**
- `ApiErrorResponse` - エラーレスポンス
- `ApiSuccessResponse<T>` - 成功レスポンス（ジェネリック）
- `ApiResponse<T>` - 統合レスポンス型
- `PaginationParams` - ページネーションパラメータ
- `PaginationMeta` - ページネーションメタ情報
- `PaginatedResponse<T>` - ページネーション付きレスポンス
- `FilterParams` - フィルターパラメータ
- `QueryParams` - クエリパラメータ全般

**使用例:**
```typescript
import { ApiErrorResponse, PaginatedResponse } from '@/lib/types'

const handleError = (error: ApiErrorResponse) => {
  console.error(error.error)
}

const response: PaginatedResponse<Room> = {
  data: [...],
  meta: { total: 100, page: 1, limit: 20, hasMore: true }
}
```

### 9. `index.ts` - エントリーポイント

すべての型を一箇所から簡単にインポートできるようにre-export。

**使用例:**
```typescript
// すべての型を一括インポート
import type {
  Room,
  FileMetadata,
  ChatMessage,
  UsageSummary,
  ApiErrorResponse
} from '@/lib/types'

// または個別にインポート
import type { Room } from '@/lib/types/database'
import type { ChatMessage } from '@/lib/types/chat'
```

## 使用方法

### 1. 基本的なインポート

```typescript
import type { Room, ChatMessage, FileMetadata } from '@/lib/types'
```

### 2. コンポーネントでの使用

```typescript
import type { FileMetadata, UsageSummary } from '@/lib/types'

export default function AdminPage() {
  const [files, setFiles] = useState<FileMetadata[]>([])
  const [usage, setUsage] = useState<UsageSummary | null>(null)

  // ...
}
```

### 3. API RouteHandlerでの使用

```typescript
import type { CreateRoomRequest, CreateRoomResponse } from '@/lib/types'

export async function POST(request: NextRequest) {
  const body: CreateRoomRequest = await request.json()

  // ...

  return NextResponse.json<CreateRoomResponse>({
    room: { /* ... */ }
  })
}
```

### 4. 型ガードの実装

```typescript
import type { ApiErrorResponse, ApiSuccessResponse } from '@/lib/types'

function isErrorResponse(response: unknown): response is ApiErrorResponse {
  return (response as ApiErrorResponse).error !== undefined
}

const response = await fetch('/api/...')
const data = await response.json()

if (isErrorResponse(data)) {
  console.error(data.error)
} else {
  console.log(data.data)
}
```

## ベストプラクティス

### 1. `any`型を避ける

❌ **悪い例:**
```typescript
const data: any = await response.json()
```

✅ **良い例:**
```typescript
import type { RoomDetailsResponse } from '@/lib/types'
const data: RoomDetailsResponse = await response.json()
```

### 2. 型アサーションより型定義を使う

❌ **悪い例:**
```typescript
const room = data as any
```

✅ **良い例:**
```typescript
import type { Room } from '@/lib/types'
const room = data as Room
```

### 3. ジェネリック型を活用する

```typescript
import type { ApiResponse } from '@/lib/types'

async function fetchData<T>(url: string): Promise<ApiResponse<T>> {
  const response = await fetch(url)
  return response.json()
}

const roomData = await fetchData<Room>('/api/rooms/xxx')
```

## 今後の拡張

必要に応じて以下の型を追加する可能性があります：

1. **webhook.ts** - Webhook関連の型
2. **notification.ts** - 通知関連の型
3. **analytics.ts** - 分析関連の型
4. **settings.ts** - 設定関連の型

## 参考資料

- [TypeScript Handbook - Type Declarations](https://www.typescriptlang.org/docs/handbook/2/type-declarations.html)
- [Supabase Generated Types](https://supabase.com/docs/guides/api/generating-types)
- [Next.js TypeScript](https://nextjs.org/docs/app/building-your-application/configuring/typescript)
