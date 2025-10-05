# コミュニティチャットボット - セットアップガイド

## 📋 目次

1. [必要なもの](#必要なもの)
2. [Supabaseプロジェクトのセットアップ](#supabaseプロジェクトのセットアップ)
3. [環境変数の設定](#環境変数の設定)
4. [ローカル開発](#ローカル開発)
5. [Vercelへのデプロイ](#vercelへのデプロイ)
6. [使い方](#使い方)

---

## 必要なもの

- Node.js 18以上
- npm または yarn
- Supabaseアカウント（無料プランでOK）
- Vercelアカウント（無料プランでOK）
- OpenAI APIキー（各ルームごとに必要）

---

## Supabaseプロジェクトのセットアップ

### 1. Supabaseプロジェクトを作成

1. [Supabase](https://supabase.com/)にアクセスしてログイン
2. 「New Project」をクリック
3. プロジェクト名とパスワードを設定（リージョンは日本が近い場所を推奨）

### 2. データベーススキーマを適用

1. Supabaseのダッシュボードで「SQL Editor」を開く
2. `/supabase/schema.sql` の内容をコピーして貼り付け
3. 「Run」をクリックして実行

### 3. Storageバケットを作成

1. Supabaseのダッシュボードで「Storage」を開く
2. 「Create a new bucket」をクリック
3. バケット名: `documents`
4. Public bucket: **OFF**（プライベート）
5. 「Create bucket」をクリック

### 4. 認証情報を取得

以下の情報をメモしてください：

- **Project URL**: `Settings` → `API` → `Project URL`
- **Anon Key**: `Settings` → `API` → `anon` `public` key
- **Service Role Key**: `Settings` → `API` → `service_role` key（⚠️ これは秘密情報です）

---

## 環境変数の設定

### 1. `.env.local` ファイルを作成

プロジェクトのルートディレクトリに `.env.local` ファイルを作成します：

```bash
cp .env.example .env.local
```

### 2. 環境変数を設定

`.env.local` を編集して以下の値を設定：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Super Admin
SUPER_ADMIN_KEY=your-super-secret-admin-key-min-32-chars

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**重要:**
- `SUPER_ADMIN_KEY` は32文字以上のランダムな文字列を設定してください
- このキーは暗号化にも使用されるため、絶対に他人に教えないでください

---

## ローカル開発

### 1. 依存パッケージをインストール

```bash
npm install
```

### 2. 開発サーバーを起動

```bash
npm run dev
```

### 3. ブラウザでアクセス

- トップページ: http://localhost:3000
- スーパー管理者: http://localhost:3000/super-admin

---

## Vercelへのデプロイ

### 1. GitHubリポジトリにプッシュ

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Vercelでプロジェクトをインポート

1. [Vercel](https://vercel.com/)にログイン
2. 「Add New Project」をクリック
3. GitHubリポジトリを選択
4. 環境変数を設定：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPER_ADMIN_KEY`
   - `NEXT_PUBLIC_APP_URL`（デプロイ後のURL、例: `https://your-app.vercel.app`）

5. 「Deploy」をクリック

### 3. デプロイ完了後

デプロイが完了したら、`NEXT_PUBLIC_APP_URL` を実際のVercel URLに更新してください。

---

## 使い方

### スーパー管理者として

1. `https://your-app.vercel.app/super-admin` にアクセス
2. `SUPER_ADMIN_KEY` を入力してログイン
3. 新しいルームを作成：
   - ルーム名（例: 糸の森自治会）
   - OpenAI APIキー
   - メタプロンプト（AIのキャラクター設定）
4. 作成後に表示される**管理者用URL**を保存（今しか表示されません！）

### ルーム管理者として

1. スーパー管理者から受け取った管理者用URLにアクセス
2. ルーム設定を編集可能：
   - ルーム名変更
   - APIキー更新
   - メタプロンプト編集
3. ファイルをアップロード：
   - PDF、Word、テキスト、Markdownファイル対応
   - アップロードすると自動でAIが読み込み可能な形式に変換

### 住民（エンドユーザー）として

1. チャット用URL（例: `https://your-app.vercel.app/chat/abc123`）にアクセス
2. 質問を入力して送信
3. AIがアップロードされた資料を元に回答

---

## トラブルシューティング

### エラー: "Cannot find module 'pdf-parse'"

```bash
npm install pdf-parse mammoth
```

### エラー: "Encryption failed"

`SUPER_ADMIN_KEY` が32文字以上であることを確認してください。

### Supabaseエラー

- データベーススキーマが正しく適用されているか確認
- `documents` バケットが作成されているか確認
- 環境変数が正しく設定されているか確認

### OpenAI APIエラー

- APIキーが正しいか確認
- APIキーの利用制限に達していないか確認
- OpenAIアカウントに残高があるか確認

---

## セキュリティに関する注意

⚠️ **重要な注意事項:**

1. `SUPER_ADMIN_KEY` と `SUPABASE_SERVICE_ROLE_KEY` は絶対に公開しないでください
2. `.env.local` は `.gitignore` に含まれており、Gitにコミットされません
3. 管理者用URLは安全な方法で共有してください（メール、暗号化されたメッセージなど）
4. 本番環境では必ずHTTPS（Vercelは自動的にHTTPS）を使用してください

---

## サポート

問題が発生した場合は、GitHubのIssueを作成してください。

---

**Powered by Next.js, Supabase, OpenAI**
