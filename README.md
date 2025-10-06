# 🤖 コミュニティチャットボットシステム

地域の自治会、マンション管理組合、商店街など、様々なコミュニティが独自のAIチャットボットを簡単に運用できるプラットフォームです。

## ✨ 主な機能

### 🎯 マルチテナント対応
- 複数のコミュニティ（ルーム）を一つのシステムで管理
- 各ルームは完全に独立したデータ・設定を保持

### 📄 ドキュメント管理
- PDF、Word、テキスト、Markdownファイルのアップロード対応（最大10MB）
- 自動的にAIが理解できる形式に変換・ベクトル化

### 🤖 RAG (Retrieval-Augmented Generation)
- アップロードされた資料を元にAIが回答を生成
- OpenAI GPT-4o-miniを使用した高品質な応答
- ベクトル検索による高精度な情報抽出

### 🎨 カスタマイズ可能
- メタプロンプトでAIのキャラクターや応答スタイルを設定
- 各コミュニティごとに独自のOpenAI APIキーを使用

### 📊 使用量トラッキング
- チャット回数、アップロードファイル数、トークン使用量を可視化
- 推定コストをダッシュボードで確認
- 過去30日間の詳細な使用状況

### 🔒 セキュリティ
- Cookie/セッションベースの安全な認証
- HTTPOnly Cookie (XSS対策)
- SameSite=Lax (CSRF対策)
- OpenAI APIキーの暗号化保存
- Supabase Row Level Security (RLS)

## 🏗️ 技術スタック

- **フロントエンド**: Next.js 15 (App Router), React 18, TailwindCSS, shadcn/ui
- **バックエンド**: Next.js API Routes
- **データベース**: Supabase (PostgreSQL + pgvector)
- **AI**: OpenAI API (GPT-4o-mini, text-embedding-3-small)
- **認証**: iron-session
- **デプロイ**: Vercel
- **ファイル処理**: pdf-parse, mammoth

## 📦 セットアップ

### 1. リポジトリをクローン

```bash
git clone https://github.com/Fumiyasu01/chatbot-jichikai.git
cd chatbot-jichikai
```

### 2. 依存パッケージをインストール

```bash
npm install
```

### 3. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com)でプロジェクトを作成
2. SQL Editorで以下を実行:

```sql
-- supabase/schema.sql の内容を実行
-- supabase/migrations/add_usage_tracking.sql も実行
```

### 4. 環境変数を設定

`.env.example`を`.env.local`にコピーして編集:

```bash
cp .env.example .env.local
```

```.env.local
# Supabase (Supabaseダッシュボードから取得)
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Super Admin (強力なパスワードを設定)
SUPER_ADMIN_KEY=your-super-admin-secret-key

# Session (32文字以上のランダム文字列)
SESSION_SECRET=your-session-secret-at-least-32-characters-long

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 でアクセス

## 🚀 使い方

### 1. スーパー管理者として新しいルームを作成

1. `/super-admin` にアクセス
2. `SUPER_ADMIN_KEY` でログイン
3. 新しいルームを作成
4. 管理者用URLをルーム管理者に共有

### 2. ルーム管理者としてセットアップ

1. 管理者用URLにアクセスしてログイン
2. OpenAI APIキーを設定
3. ファイルをアップロード（PDF/Word/テキスト/Markdown）
4. メタプロンプトでAIの性格を設定
5. 使用量ダッシュボードで利用状況を確認

### 3. 住民がチャットを利用

1. チャット用URLにアクセス
2. 質問を入力
3. AIが資料を元に回答

## 🌐 Vercelへのデプロイ

### 1. Vercel CLIのインストール

```bash
npm i -g vercel
```

### 2. デプロイ

```bash
vercel
```

### 3. 環境変数の設定

Vercelダッシュボードで以下の環境変数を設定:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPER_ADMIN_KEY`
- `SESSION_SECRET`
- `NEXT_PUBLIC_APP_URL` (例: https://your-app.vercel.app)

### 4. 本番デプロイ

```bash
vercel --prod
```

## 📁 プロジェクト構造

```
chatbot-jichikai/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/          # 認証API (ログイン/ログアウト)
│   │   │   ├── chat/          # チャットAPI（RAG実装）
│   │   │   └── rooms/         # ルーム管理API
│   │   ├── admin/[roomId]/    # ルーム管理画面
│   │   ├── chat/[roomId]/     # ユーザー向けチャット画面
│   │   ├── super-admin/       # スーパー管理者画面
│   │   └── page.tsx           # トップページ
│   ├── components/
│   │   └── ui/                # UIコンポーネント
│   └── lib/
│       ├── supabase/          # Supabaseクライアント
│       ├── session.ts         # セッション管理
│       ├── auth-middleware.ts # 認証ミドルウェア
│       ├── usage-tracking.ts  # 使用量トラッキング
│       └── utils/             # ユーティリティ関数
│           ├── crypto.ts      # 暗号化
│           ├── text-extraction.ts  # テキスト抽出
│           ├── chunking.ts    # チャンク分割
│           └── validation.ts  # バリデーション
├── supabase/
│   ├── schema.sql                   # データベーススキーマ
│   └── migrations/
│       └── add_usage_tracking.sql   # 使用量トラッキングテーブル
├── vercel.json                      # Vercel設定
├── SETUP.md                         # セットアップガイド
└── README.md                        # このファイル
```

## 💰 コスト管理

- 使用量ダッシュボードでトークン数とコストを確認可能
- ルームごとに独立したOpenAI APIキーで各組織が自己管理
- 推定コスト表示:
  - GPT-4o-mini: 入力 $0.15/1M tokens、出力 $0.60/1M tokens
  - text-embedding-3-small: $0.02/1M tokens

## 🔐 セキュリティ機能

✅ Cookie/セッションベースの認証
✅ HTTPOnly Cookie (XSS対策)
✅ SameSite=Lax (CSRF対策)
✅ 暗号化されたAPIキー保存
✅ Row Level Security (RLS) on Supabase
✅ 環境変数による機密情報の管理

## 🌟 今後の拡張可能性

- ✅ 使用量ダッシュボード（実装済み）
- ✅ セキュアな認証システム（実装済み）
- LINE/Slack連携
- 既存サイトへの埋め込みウィジェット
- 会話履歴の保存・検索
- アクセス制限機能
- 複数AI対応（Claude, Geminiなど）
- 大容量ファイル対応（非同期処理）

## 📄 ライセンス

MIT License

## 🤝 コントリビューション

Issue、Pull Requestは大歓迎です！

GitHubリポジトリ: https://github.com/Fumiyasu01/chatbot-jichikai

---

**Powered by Next.js, Supabase, OpenAI**
