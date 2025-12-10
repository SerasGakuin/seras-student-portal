# デプロイガイド

本アプリケーションは **Vercel** へのデプロイに最適化されています。

## Vercel へのデプロイ手順

1.  **GitHub へのプッシュ**: コードをリポジトリ (`main` ブランチ等) にプッシュします。
2.  **Vercel でのプロジェクト作成**:
    - Vercel Dashboard -> "Add New" -> "Project"
    - 対象の GitHub リポジトリを選択します。
3.  **環境変数の設定**:
    - ローカルの `.env.local` の内容を、Vercel の Project Settings > Environment Variables にコピーします。
    - **注意**: `GOOGLE_SHEETS_PRIVATE_KEY` の改行コード (`\n`) が問題になる場合があります。設定画面で改行として認識されているか確認するか、コード側で `replace(/\\n/g, '\n')` する処理を入れる等の対応が必要なケースがあります（本プロジェクトの設定では自動処理されません、必要に応じて `src/lib/config.ts` で置換しています）。

## ビルドコマンド
Next.js デフォルトのコマンドを使用します。
```bash
next build
```

## 本番環境での考慮事項
- **キャッシュ**: Next.js App Router はリクエストを積極的にキャッシュします。リアルタイム性が求められる在室状況 (`/api/occupancy`) は `{ cache: 'no-store' }` を指定しています。
- **タイムゾーン**: サーバーレス関数（Vercel）は UTC で動作します。日付操作（予約日時の計算など）は、コード内で明示的に日本時間 (JST) への変換や、タイムゾーン付き ISO 文字列 (`Asia/Tokyo`) の指定を行っています。
- **環境設定**: Vercel 上では自動的に `NODE_ENV=production` がセットされます。

## LINE Developers の設定
デプロイ後、**LINE Login Channel** の設定を更新してください。
- **LIFF URL**: 本番環境の URL に変更する必要があります。エンドポイント設定で「LIFF URL」として登録・公開してください。
