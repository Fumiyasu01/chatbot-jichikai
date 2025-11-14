# Type Definitions

このディレクトリには、プロジェクト全体で使用される型定義が含まれています。

## 📁 ファイル一覧

| ファイル | 説明 | 主な型 |
|---------|------|--------|
| `index.ts` | すべての型のエントリーポイント | - |
| `database.ts` | Supabase Database型のラッパー | Room, Document, File |
| `room.ts` | Room管理関連 | RoomDisplay, CreateRoomRequest |
| `file.ts` | ファイルアップロード関連 | FileMetadata, FileUploadResponse |
| `document.ts` | ドキュメント検索関連 | DocumentWithSimilarity, SourceReference |
| `chat.ts` | チャット機能関連 | ChatMessage, StreamMessage |
| `auth.ts` | 認証・セッション関連 | SessionData, AuthResult |
| `usage.ts` | 使用量トラッキング関連 | UsageSummary, UsageLogParams |
| `api.ts` | 汎用API型 | ApiErrorResponse, PaginatedResponse |

## 🚀 使用方法

### 基本的なインポート

```typescript
// すべての型を一括でインポート
import type {
  Room,
  ChatMessage,
  FileMetadata,
  UsageSummary
} from '@/lib/types'

// 個別にインポート（推奨）
import type { Room } from '@/lib/types/database'
import type { ChatMessage } from '@/lib/types/chat'
```

### コンポーネントでの使用例

```typescript
import type { FileMetadata, UsageSummary } from '@/lib/types'

export default function AdminPage() {
  const [files, setFiles] = useState<FileMetadata[]>([])
  const [usage, setUsage] = useState<UsageSummary | null>(null)

  // 型安全なコード
}
```

### API Routeでの使用例

```typescript
import type { CreateRoomRequest, CreateRoomResponse } from '@/lib/types'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body: CreateRoomRequest = await request.json()

  // 型安全な処理

  return NextResponse.json<CreateRoomResponse>({
    room: {
      id: 'xxx',
      name: body.name,
      // ...
    }
  })
}
```

## ✨ ベストプラクティス

### ❌ 避けるべきパターン

```typescript
// anyを使う
const data: any = await response.json()

// 型アサーションの乱用
const room = data as any
```

### ✅ 推奨パターン

```typescript
// 適切な型を使う
import type { RoomDetailsResponse } from '@/lib/types'
const data: RoomDetailsResponse = await response.json()

// 型ガードを使う
function isErrorResponse(res: unknown): res is ApiErrorResponse {
  return (res as ApiErrorResponse).error !== undefined
}
```

## 📚 詳細ドキュメント

より詳しい情報は、プロジェクトルートの [`docs/TYPE_DEFINITIONS.md`](/docs/TYPE_DEFINITIONS.md) を参照してください。

## 🔧 型定義の追加

新しい型を追加する場合：

1. 適切なカテゴリのファイルに型を追加（または新規ファイル作成）
2. `index.ts` でエクスポート
3. `docs/TYPE_DEFINITIONS.md` にドキュメントを追加

## 📝 命名規則

- **Interface/Type名**: PascalCase（例: `ChatMessage`, `UsageSummary`）
- **ファイル名**: kebab-case（例: `chat.ts`, `usage.ts`）
- **リクエスト型**: `*Request` で終わる（例: `CreateRoomRequest`）
- **レスポンス型**: `*Response` で終わる（例: `CreateRoomResponse`）
- **メタデータ型**: `*Metadata` で終わる（例: `FileMetadata`）

## 🎯 目的

- **型安全性の向上**: `any`型の排除
- **コードの可読性**: 明確な型定義による理解しやすさ
- **メンテナンス性**: 一箇所での型管理
- **開発体験の向上**: IDEの補完機能の最大活用
