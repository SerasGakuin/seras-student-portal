# 開発環境セットアップガイド

Seras学院生徒ポータルの開発環境構築手順です。

## 前提条件
- **Node.js**: v20以上
- **npm**: Node.jsに同梱
- **Google Cloud Platform アカウント**: Sheets & Calendar API 利用のため
- **LINE Developers アカウント**: LIFF 連携のため

## インストール手順

1.  **リポジトリの複製**
    ```bash
    git clone <repository-url>
    cd seras-student-portal
    ```

2.  **依存パッケージのインストール**
    ```bash
    npm install
    ```

3.  **環境変数の設定**
    プロジェクトルートに `.env.local` ファイルを作成してください。このファイルには機密情報が含まれるため、Gitにはコミットしないでください。

    ```env
    # --- Google Workspace 連携 ---
    # サービスアカウントの秘密鍵 (\n で改行を表現するか、1行にして記述)
    GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
    # サービスアカウントのメールアドレス
    GOOGLE_SHEETS_CLIENT_EMAIL="example@project-id.iam.gserviceaccount.com"
    
    # スプレッドシートID (URLから抽出: docs.google.com/spreadsheets/d/{この部分}/edit)
    STUDENT_SPREADSHEET_ID="your_student_master_spreadsheet_id"
    OCCUPANCY_SPREADSHEET_ID="your_occupancy_log_spreadsheet_id"
    
    # Google Calendar ID ('primary' または 'your_calendar_id@group.calendar.google.com')
    GOOGLE_CALENDAR_ID="your_calendar_id"

    # --- LINE 連携 ---
    # LIFF ID (LINE Developers コンソールから取得)
    NEXT_PUBLIC_LIFF_ID="12345678-abcdefgh"
    
    # チャネルアクセストークン (Messaging API用)
    LINE_CHANNEL_ACCESS_TOKEN="long_access_token_string"
    ```

4.  **開発サーバーの起動**
    ```bash
    npm run dev
    ```
    ブラウザで `http://localhost:3000` にアクセスして動作確認を行ってください。

## 開発時のモック (Mocking)
有効なAPIキーがない場合、アプリケーションの一部機能が動作しません。
- **フロントエンド (`src/lib/liff.tsx`)**: ローカル環境 (`NODE_ENV=development`) かつ LINEアプリ外で開いた場合、LIFF初期化エラー時にテスト用のモックユーザー情報 (`テストユーザー (Fallback)`) を自動セットします。
- **バックエンド**: サービス層 (`src/services`) の単体テスト (`npm test`) では、外部APIをモック化しているため、通信なしでロジック検証が可能です。
