# Seras Student Portal

## 概要
Seras学院の生徒向けポータルサイトのソースコードリポジトリです。本アプリケーションは、自習室の利用状況確認や面談予約などの機能を統合し、生徒の学習環境をサポートすることを目的としています。
Next.js (App Router) をベースに構築され、**LINE Front-end Framework (LIFF)** を用いたシームレスな認証基盤を採用することで、生徒はLINEアプリからストレスなく各機能にアクセス可能です。

## 主な機能

### 1. LINE統合認証 (`LIFF Integration`)
LINEアカウントを利用したシングルサインオン（SSO）機能を提供します。
- **自動ログイン**: 生徒がLINEブラウザからポータルを開いた際、自動的にLINE IDを取得し、システムへのログインを完了します。
- **生徒情報の連携**: 取得したLINE IDをキーとして、バックエンドの生徒マスタ（Google Sheets）から生徒情報を取得し、画面上にユーザー名を表示します。

### 2. 在室状況モニタリング (`/occupancy`)
自習室（本館および2号館）の現在の利用状況を可視化します。
- **リアルタイム更新**: Google Sheets APIを経由して、最新の在室人数を取得・表示します。
- **混雑度の可視化**: 定員に対する現在の利用率を計算し、混雑状況を直感的なメッセージと色でユーザーに伝えます。

### 3. 予約・連絡システム (`/booking`)
面談の予約および欠席連絡を行うためのインターフェースです。
- **面談予約**:
    - 日付および時間帯を選択し、面談を予約します。
    - Google Calendar APIと連携し、予約確定時にカレンダーへ予定を自動登録します。
- **欠席登録**:
    - 簡易な操作で欠席予定を登録できます。

## アーキテクチャ

本プロジェクトでは、スケーラビリティと保守性を重視し、**Feature-based Architecture**（機能単位のアーキテクチャ）を採用しています。

- **`src/features`**: 機能ごとにディレクトリを分割し、関連するコンポーネントやロジックを集約しています（例: `booking`, `occupancy`）。
- **`src/components/ui`**: アプリケーション全体で利用される汎用的なUIコンポーネント（ `PageHeader`, `Button`, `GlassCard` 等）を管理します。
- **`src/lib`**: 外部APIクライアント（Google, LINE）や共通ユーティリティを配置しています。

## 技術スタック

| カテゴリ | 技術 | バージョン | 備考 |
| --- | --- | --- | --- |
| **Framework** | Next.js | 16.0.7 | App Router採用 |
| **Language** | TypeScript | 5.x | |
| **UI Library** | React | 19.2.0 | |
| **Styling** | CSS Modules | - | Glassmorphism UI |
| **Auth** | LINE LIFF | 2.27.3 | SSO連携 |
| **Backend** | Google APIs | - | Sheets, Calendar |

## 開発環境のセットアップ

### 前提条件
- Node.js v20以上
- npm

### インストール手順

1. リポジトリのクローン:
   ```bash
   git clone <repository-url>
   cd seras-student-portal
   ```

2. 依存パッケージのインストール:
   ```bash
   npm install
   ```

3. 環境変数の設定:
   プロジェクトルートに `.env.local` ファイルを作成し、以下の変数を設定してください。

   ```env
   # Google Sheets / Calendar API
   GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
   GOOGLE_SHEETS_CLIENT_EMAIL="example@service-account.iam.gserviceaccount.com"
   STUDENT_SPREADSHEET_ID="your_student_spreadsheet_id"
   OCCUPANCY_SPREADSHEET_ID="your_occupancy_spreadsheet_id"
   GOOGLE_CALENDAR_ID="your_calendar_id"

   # LINE LIFF
   NEXT_PUBLIC_LIFF_ID="your_liff_id"
   ```

4. 開発サーバーの起動:
   ```bash
   npm run dev
   ```
   ブラウザで `http://localhost:3000` にアクセスして動作を確認してください。

## セキュリティに関する特記

現在（Phase 1）の認証実装では、ユーザー体験の向上と開発速度を優先し、LIFF SDKからクライアントサイドで取得した `userId` をバックエンドAPIへ送信する方式を採用しています。この方式は内部向けプロトタイプとしては機能しますが、より高いセキュリティレベルが求められる環境への適用時には、以下の改修を推奨します。

- **IDトークンのバックエンド検証**: 
  クライアントから `userId` を直接送信するのではなく、`access_token` または `id_token` を送信し、バックエンド側で [LINE Verified API](https://developers.line.biz/ja/reference/line-login/#verify-id-token) を実行してユーザーの正当性を検証する方式への変更を検討してください。これにより、リクエストのなりすましリスクを排除できます。

## ディレクトリ構成

```
seras-student-portal/
├── src/
│   ├── app/                    # ページ・API Route (Next.js App Router)
│   ├── components/             # 共有コンポーネント
│   │   └── ui/                 # PageHeader, Button等の汎用パーツ
│   ├── features/               # 機能別モジュール
│   │   ├── booking/            # 予約・欠席登録機能
│   │   └── occupancy/          # 混雑状況表示機能
│   ├── lib/                    # APIクライアント (liff.tsx等)
│   └── types/                  # 共通型定義
├── public/                     # 静的画像アセット
└── ...
```
