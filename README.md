# Seras学院 生徒ポータル

Seras学院の生徒向けWebサービスを統合したポータルサイトです。

## 📱 サービス一覧

### 1. 在室人数表示 (`/occupancy/`)
自習室（本館・2号館）の在室人数をリアルタイムで表示します。
- **技術スタック**: HTML, CSS, Vanilla JavaScript
- **バックエンド**: Google Apps Script (GAS)
- **更新間隔**: 5秒

├── gas-backend/                 # 予約システム用バックエンド
│   ├── src/
│   │   ├── Code.js              # メインロジック
│   │   └── appsscript.json      # プロジェクト設定
│   └── .clasp.json              # clasp設定
└── docs/                        # ドキュメント
```

## 🚀 開発環境のセットアップ

### 1. フロントエンド

ローカルサーバーを起動して開発します。

```bash
# 依存関係のインストール（初回のみ）
npm install

# 開発サーバーの起動
npx -y live-server
```

ブラウザが自動的に開き、`http://127.0.0.1:8080` でアクセスできます。

### 2. バックエンド (GAS)

予約システムのバックエンドは `gas-backend/` ディレクトリで管理しています。
`clasp` を使用して開発・デプロイを行います。

#### セットアップ

```bash
cd gas-backend
npm install
npx @google/clasp login
```

#### 開発・デプロイフロー

**重要: `clasp run` は使用しません。** 以下の手順でデプロイして検証します。

1.  **コード編集**: `gas-backend/src/Code.js` を編集します。
2.  **Push**: コードをGASプロジェクトにアップロードします。
    ```bash
    npx @google/clasp push
    ```
3.  **Deploy (固定ID)**:
    URLを固定するため、常に**同じデプロイメントID**に対して新しいバージョンをデプロイします。
    
    ```bash
    # 初回のみ: 新規デプロイ作成
    # npx @google/clasp deploy --description "Initial deployment"
    
    # 2回目以降: 既存のデプロイIDを指定して更新（URLが変わらない）
    npx @google/clasp deploy -i <DEPLOYMENT_ID> --description "変更内容の説明"
    ```
    
    ※ `DEPLOYMENT_ID` は `npx @google/clasp deployments` で確認できます（`@HEAD` ではなく `@数字` がついているもの）。

4.  **検証**: `curl` またはフロントエンドアプリから動作確認します。

#### 注意点
- **権限エラー**: `Exception: You do not have permission...` が出る場合は、ブラウザでGASエディタを開き、関数を一度手動実行して権限を承認してください。

## 🗺️ 今後の開発ロードマップ

### フェーズ1: フロントエンド開発（完了）
- [x] UI/UXの実装（HTML/CSS/JS）
- [x] フォームロジックの実装
- [x] バックエンドとの結合テスト（ダミーユーザー）

### フェーズ2: LIFF連携（次フェーズ）
- [ ] LIFF IDの取得と `config.js` への設定
- [ ] `DEV_MODE` を `false` に変更
- [ ] 実機（LINEアプリ）での動作確認
- [ ] `userId` 取得ロジックの本番化

### フェーズ3: 本番運用
- [ ] GitHub Pagesへのデプロイ
- [ ] LINE公式アカウントのリッチメニューへのリンク設定

## 📄 ライセンス

© 2025 Seras学院
