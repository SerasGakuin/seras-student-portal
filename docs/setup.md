# 開発環境セットアップガイド

Seras学院生徒ポータルの開発環境構築手順です。

## 前提条件
- **Node.js**: v20以上
- **npm**: Node.jsに同梱
- **Python**: v3.12以上 (`uv` 利用のため)
- **uv**: 高速なPythonパッケージマネージャ
- **Google Cloud Platform アカウント**: Sheets & Calendar API 利用のため
- **LINE Developers アカウント**: LIFF 連携のため

## インストール手順

### A. Webアプリケーション (Next.js)

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
    # サービスアカウントの秘密鍵 (\\n で改行を表現するか、1行にして記述)
    GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n..."
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

    # --- Google OAuth (ダッシュボード認証用) ---
    # Google Cloud Console で OAuth クライアントを作成
    GOOGLE_CLIENT_ID="your_client_id.apps.googleusercontent.com"
    GOOGLE_CLIENT_SECRET="GOCSPX-your_secret"
    NEXTAUTH_SECRET="openssl rand -base64 32 で生成"
    NEXTAUTH_URL="http://localhost:3000"
    ALLOWED_EMAILS="seras.gakuin@gmail.com"
    ```

4.  **開発サーバーの起動**
    ```bash
    npm run dev
    ```
    ブラウザで `http://localhost:3000` にアクセスして動作確認を行ってください。

### B. データ分析環境 (Python/Jupyter)

本プロジェクトでは実験的にデータ分析環境を `analysis/` ディレクトリに用意しています。パッケージ管理には `uv` を使用します。

1.  **uv のインストール** (未導入の場合)
    ```bash
    # macOS / Linux
    curl -LsSf https://astral.sh/uv/install.sh | sh
    ```

2.  **分析用環境変数の設定**
    `analysis/` ディレクトリ内に `.env` ファイルを作成します。
    ※ Webアプリと同じ認証情報を使用します。

    ```bash
    cd analysis
    touch .env
    ```

    `analysis/.env` の内容:
    ```env
    GOOGLE_SERVICE_ACCOUNT_EMAIL="example@project-id.iam.gserviceaccount.com"
    GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
    OCCUPANCY_SPREADSHEET_ID="your_occupancy_log_spreadsheet_id"
    ```

3.  **環境の同期とJupyterの起動**
    `uv` を使用して依存関係を同期し、Jupyter Labを起動します。

    ```bash
    # 仮想環境の作成とパッケージ同期
    uv sync

    # Jupyter Lab の起動
    uv run -- jupyter lab
    ```

## 開発時のモック (Mocking)
有効なAPIキーがない場合、アプリケーションの一部機能が動作しません。
- **フロントエンド (`src/lib/liff.tsx`)**: ローカル環境 (`NODE_ENV=development`) かつ LINEアプリ外で開いた場合、LIFF初期化エラー時にテスト用のモックユーザー情報 (`テストユーザー (Fallback)`) を自動セットします。
- **バックエンド**: サービス層 (`src/services`) の単体テスト (`npm test`) では、外部APIをモック化しているため、通信なしでロジック検証が可能です。
