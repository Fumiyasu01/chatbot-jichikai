# 🤖 地域コミュニティ向け汎用チャットボットシステム

地域の自治会、マンション管理組合、商店街など、様々なコミュニティが独自のAIチャットボットを簡単に運用できるプラットフォームです。

## ✨ 主な機能

### 🎯 マルチテナント対応
- 複数のコミュニティ（ルーム）を一つのシステムで管理
- 各ルームは完全に独立したデータ・設定を保持

### 📄 ドキュメント管理
- PDF、Word、テキスト、Markdownファイルのアップロード対応
- 自動的にAIが理解できる形式に変換・ベクトル化

### 🤖 RAG (Retrieval-Augmented Generation)
- アップロードされた資料を元にAIが回答を生成
- OpenAI GPT-4o-miniを使用した高品質な応答
- ベクトル検索による高精度な情報抽出

### 🎨 カスタマイズ可能
- メタプロンプトでAIのキャラクターや応答スタイルを設定
- 各コミュニティごとに独自のOpenAI APIキーを使用

### 🔒 セキュリティ
- APIキーの暗号化保存
- ルームごとの管理者キー認証
- スーパー管理者による全体管理

## 🏗️ 技術スタック

- **フロントエンド**: Next.js 14, React 18, TailwindCSS, shadcn/ui
- **バックエンド**: Next.js API Routes
- **データベース**: Supabase (PostgreSQL + pgvector)
- **AI**: OpenAI API (GPT-4o-mini, text-embedding-3-small)
- **デプロイ**: Vercel
- **ファイル処理**: pdf-parse, mammoth

## 📦 セットアップ

詳細なセットアップ手順は [SETUP.md](./SETUP.md) をご覧ください。

### クイックスタート

1. **リポジトリをクローン**
   ```bash
   git clone <your-repo-url>
   cd chatbot-jichikai
   ```

2. **依存パッケージをインストール**
   ```bash
   npm install
   ```

3. **環境変数を設定**
   ```bash
   cp .env.example .env.local
   # .env.local を編集して必要な値を設定
   ```

4. **Supabaseのセットアップ**
   - Supabaseプロジェクトを作成
   - `supabase/schema.sql` を実行
   - `documents` バケットを作成

5. **開発サーバーを起動**
   ```bash
   npm run dev
   ```

6. **ブラウザでアクセス**
   - http://localhost:3000

## 🚀 使い方

### 1. スーパー管理者として新しいルームを作成

1. `/super-admin` にアクセス
2. `SUPER_ADMIN_KEY` でログイン
3. 新しいルームを作成
4. 管理者用URLをルーム管理者に共有

### 2. ルーム管理者としてファイルをアップロード

1. 管理者用URLにアクセス
2. ファイルをアップロード（PDF/Word/テキスト/Markdown）
3. メタプロンプトでAIの性格を設定

### 3. 住民がチャットを利用

1. チャット用URLにアクセス
2. 質問を入力
3. AIが資料を元に回答

## 📁 プロジェクト構造

```
chatbot-jichikai/
├── src/
│   ├── app/
│   │   ├── api/              # APIルート
│   │   │   ├── chat/         # チャットAPI（RAG実装）
│   │   │   └── rooms/        # ルーム管理API
│   │   ├── admin/            # ルーム管理画面
│   │   ├── chat/             # ユーザー向けチャット画面
│   │   ├── super-admin/      # スーパー管理者画面
│   │   └── page.tsx          # トップページ
│   ├── components/
│   │   └── ui/               # UIコンポーネント
│   └── lib/
│       ├── supabase/         # Supabaseクライアント
│       └── utils/            # ユーティリティ関数
│           ├── crypto.ts     # 暗号化
│           ├── text-extraction.ts  # テキスト抽出
│           ├── chunking.ts   # チャンク分割
│           └── validation.ts # バリデーション
├── supabase/
│   └── schema.sql            # データベーススキーマ
├── SETUP.md                  # セットアップガイド
└── README.md                 # このファイル
```

## 🔐 セキュリティ

- OpenAI APIキーはAES-256-GCMで暗号化して保存
- ルームごとの管理者キー認証
- Supabase Row Level Security (RLS) によるデータ保護
- 環境変数による機密情報の管理

## 🌟 今後の拡張可能性

- LINE/Slack連携
- 既存サイトへの埋め込みウィジェット
- 会話履歴の保存
- アクセス制限機能
- 使用量ダッシュボード
- 複数AI対応（Claude, Geminiなど）

## 📄 ライセンス

MIT License

## 🤝 コントリビューション

Issue、Pull Requestは大歓迎です！

---

**Powered by Next.js, Supabase, OpenAI**
