# Seras学院 生徒ポータル

Seras学院の生徒向けWebサービスを統合したポータルサイトです。

## 📱 サービス一覧

### 1. 在室人数表示 (`/occupancy`)
自習室（本館・2号館）の在室人数をリアルタイムで表示します。
- **技術スタック**: Next.js 16, React 19, TypeScript
- **バックエンド**: Google Apps Script (Sheets API)

### 2. 予約システム (`/booking`)
面談予約と休み登録を管理します。
- **面談予約** (`/booking/reserve`): 面談を予約。
- **休み登録** (`/booking/rest`): 休みを登録
- **技術スタック**: Next.js 16, React 19, TypeScript, LINE LIFF
- **バックエンド**: Google Apps Script (Calendar API, Sheets API)

## 🏗️ プロジェクト構成

```
seras-student-portal/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx           # ポータルトップ（メニュー）
│   │   ├── globals.css        # グローバルスタイル
│   │   ├── occupancy/         # 在室人数表示
│   │   ├── booking/           # 予約システム
│   │   │   ├── page.tsx       # 予約メニュー
│   │   │   ├── reserve/       # 面談予約フォーム
│   │   │   └── rest/          # 休み登録フォーム
│   │   └── api/               # API Routes
│   ├── components/            # 共通コンポーネント
│   ├── lib/                   # ユーティリティ・ロジック
│   └── types/                 # TypeScript型定義
├── public/                    # 静的ファイル
├── archive/                   # 旧HTML版（参考用）
└── package.json
```

## 🚀 開発環境のセットアップ

### 必要な環境
- Node.js 20以上
- npm

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` ファイルを作成し、以下の環境変数を設定します：

```env
# Google Sheets API
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_CLIENT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
GOOGLE_SHEETS_SPREADSHEET_ID="your-spreadsheet-id"

# Google Calendar API
GOOGLE_CALENDAR_ID="your-calendar-id@group.calendar.google.com"

# LINE LIFF
NEXT_PUBLIC_LIFF_ID="your-liff-id"
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

`http://localhost:3000` でプレビューできます。

## 📦 ビルド・デプロイ

### ローカルビルド

```bash
npm run build
npm start
```

### Vercelへのデプロイ

このプロジェクトはVercelで自動デプロイされます。

1. **GitHubへPush**:
   ```bash
   git add .
   git commit -m "変更内容のコメント"
   git push origin main
   ```

2. Vercelが自動的に変更を検知し、デプロイを開始します。

### 環境変数の設定（Vercel）

Vercelダッシュボードで以下の環境変数を設定してください：
- `GOOGLE_SHEETS_PRIVATE_KEY`
- `GOOGLE_SHEETS_CLIENT_EMAIL`
- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_CALENDAR_ID`
- `NEXT_PUBLIC_LIFF_ID`

## 🛠️ 開発ガイド

### コードの編集

- **ページ/画面**: `src/app/` 以下のファイルを編集
- **デザイン/CSS**: `src/app/globals.css` または各コンポーネントの `.module.css` を編集
- **コンポーネント**: `src/components/` を編集
- **ロジック**: `src/lib/` を編集

編集するとブラウザが自動的にリロードされ、変更が反映されます。

### Lintとフォーマット

```bash
npm run lint
```

## 📚 技術スタック

- **フレームワーク**: Next.js 16.0.7 (App Router)
- **言語**: TypeScript 5
- **UI**: React 19.2.0
- **スタイリング**: CSS Modules
- **認証**: LINE LIFF 2.27.3
- **バックエンド**: Google Apps Script
- **デプロイ**: Vercel

## 🗺️ 今後の開発ロードマップ

### フェーズ1: Next.js移行 & UI刷新（完了）
- [x] HTML版からNext.jsへの移行
- [x] UI/UXの実装（ボタン選択式、タイムレンジスライダー）
- [x] フォームロジックの実装
- [x] バックエンドとの結合テスト
- [x] デザインのブランド統一（オレンジ基調）

### フェーズ2: LIFF連携（次フェーズ）
- [ ] LIFF IDの取得と設定
- [ ] 実機（LINEアプリ）での動作確認
- [ ] `userId` 取得ロジックの本番化

### フェーズ3: 本番運用
- [ ] Vercelへのデプロイ
- [ ] LINE公式アカウントのリッチメニューへのリンク設定
- [ ] モニタリング・ログ設定

## 📄 ライセンス

© 2025 Seras学院
