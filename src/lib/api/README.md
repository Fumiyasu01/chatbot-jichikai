# API Utilities

このディレクトリには、Next.js App RouterのAPIルート用のヘルパーユーティリティが含まれています。

## 概要

3つの主要なヘルパーを提供します:

1. **response-helpers.ts** - 一貫したAPIレスポンス生成
2. **with-auth.ts** - 認証チェックの自動化
3. **error-handler.ts** - 統一されたエラーハンドリング

## 使用例

### 1. 基本的なAPIルート (レスポンスヘルパーのみ)

```typescript
import { NextRequest } from 'next/server'
import { ApiResponse } from '@/lib/api'

export async function GET(request: NextRequest) {
  try {
    const data = await fetchSomeData()
    return ApiResponse.success({ data })
  } catch (error) {
    console.error('GET error:', error)
    return ApiResponse.internalError()
  }
}
```

### 2. 認証が必要なAPIルート (withAuth)

```typescript
import { NextRequest } from 'next/server'
import { withAuth, ApiResponse } from '@/lib/api'

export const GET = withAuth(async (request, { params }, auth) => {
  const { roomId } = await params

  // 認証済み: auth.adminKey が利用可能
  const room = await fetchRoom(roomId)

  if (!room) {
    return ApiResponse.notFound('ルームが見つかりませんでした')
  }

  return ApiResponse.success({ room })
})
```

### 3. エラーハンドリング付きAPIルート

```typescript
import { NextRequest } from 'next/server'
import { handleApiError, ApiResponse } from '@/lib/api'
import { createRoomSchema } from '@/lib/utils/validation'

export async function POST(request: NextRequest) {
  return handleApiError(async () => {
    const body = await request.json()

    // Zodバリデーション - エラーは自動的にハンドリング
    const validated = createRoomSchema.parse(body)

    const room = await createRoom(validated)

    return ApiResponse.success(
      { room },
      'ルームを作成しました'
    )
  }, {
    context: { route: 'POST /api/rooms' }
  })
}
```

### 4. 認証 + エラーハンドリング (推奨パターン)

```typescript
import { NextRequest } from 'next/server'
import { withAuth, handleApiError, ApiResponse, throwNotFoundError } from '@/lib/api'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const PATCH = withAuth(async (request, { params }, auth) => {
  return handleApiError(async () => {
    const { roomId } = await params
    const body = await request.json()

    const { data: room, error } = await supabaseAdmin
      .from('rooms')
      .update(body)
      .eq('id', roomId)
      .select()
      .single()

    if (error || !room) {
      throwNotFoundError('ルームが見つかりませんでした')
    }

    return ApiResponse.success({ room }, 'ルームを更新しました')
  }, {
    context: { route: `PATCH /api/rooms/${params.roomId}` }
  })
})
```

### 5. スーパー管理者専用APIルート

```typescript
import { NextRequest } from 'next/server'
import { withSuperAdmin, ApiResponse } from '@/lib/api'

export const DELETE = withSuperAdmin(async (request) => {
  // スーパー管理者のみアクセス可能
  await deleteAllData()
  return ApiResponse.success({ message: '削除しました' })
})
```

### 6. 複雑なエラーハンドリング

```typescript
import { NextRequest } from 'next/server'
import {
  withAuth,
  handleApiError,
  ApiResponse,
  ErrorType,
  throwApiError
} from '@/lib/api'

export const POST = withAuth(async (request, { params }, auth) => {
  return handleApiError(async () => {
    const body = await request.json()

    // カスタムバリデーション
    if (!body.file) {
      throwApiError(
        ErrorType.VALIDATION,
        'ファイルが選択されていません',
        400
      )
    }

    // ファイルサイズチェック
    if (body.file.size > 10 * 1024 * 1024) {
      throwApiError(
        ErrorType.VALIDATION,
        'ファイルサイズは10MB以下にしてください',
        400
      )
    }

    const result = await processFile(body.file)

    return ApiResponse.success(
      { file_id: result.id },
      'ファイルをアップロードしました'
    )
  }, {
    context: {
      route: 'POST /api/upload',
      userId: auth.adminKey
    }
  })
})
```

## 移行ガイド

### Before (既存コード)

```typescript
export async function GET(request: NextRequest, { params }: any) {
  try {
    const { roomId } = await params

    const auth = await requireAuth(request, roomId)
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error || '認証に失敗しました' },
        { status: 401 }
      )
    }

    const { data: room, error } = await supabaseAdmin
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    if (error || !room) {
      return NextResponse.json(
        { error: 'ルームが見つかりませんでした' },
        { status: 404 }
      )
    }

    return NextResponse.json({ room })
  } catch (error) {
    console.error('GET error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
```

### After (新しいヘルパー使用)

```typescript
export const GET = withAuth(async (request, { params }, auth) => {
  return handleApiError(async () => {
    const { roomId } = await params

    const { data: room, error } = await supabaseAdmin
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    if (error || !room) {
      throwNotFoundError('ルームが見つかりませんでした')
    }

    return ApiResponse.success({ room })
  }, {
    context: { route: 'GET /api/rooms/[roomId]' }
  })
})
```

## レスポンス形式

### 成功レスポンス

```typescript
{
  "data": { ... },
  "message": "成功しました" // optional
}
```

または

```typescript
{
  "room": { ... },
  "message": "ルームを作成しました"
}
```

### エラーレスポンス

```typescript
{
  "error": "エラーメッセージ",
  "details": { ... } // optional
}
```

## 型安全性

すべてのヘルパーはTypeScript strict modeで動作し、`any`型を最小限に抑えています。

```typescript
// 型安全なレスポンス
interface RoomResponse {
  room: {
    id: string
    name: string
  }
}

return ApiResponse.success<RoomResponse>({ room })
```

## ベストプラクティス

1. **認証が必要な場合は必ず `withAuth` を使用**
2. **エラーハンドリングは `handleApiError` で統一**
3. **カスタムエラーは `throwApiError` で投げる**
4. **レスポンスは `ApiResponse` クラスで生成**
5. **エラーログには必ずコンテキストを含める**

## パフォーマンス

- ヘルパー関数はオーバーヘッドが最小限
- 認証チェックは並列実行可能
- エラーハンドリングは遅延評価

## テスト

```typescript
import { ApiResponse, ErrorType, toApiError } from '@/lib/api'

describe('ApiResponse', () => {
  it('should create success response', () => {
    const response = ApiResponse.success({ data: 'test' })
    expect(response.status).toBe(200)
  })

  it('should create error response', () => {
    const response = ApiResponse.notFound('Not found')
    expect(response.status).toBe(404)
  })
})
```

## 参考

- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Zod Validation](https://zod.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
