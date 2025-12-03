# Seras学院 予約システム (Next.js版)

## 開発・運用ワークフロー

### 1. 開発の進め方 (ローカル)

デザインの修正や機能追加を行う場合の手順です。

1. **開発サーバーの起動**:
   ```bash
   cd next-portal
   npm run dev
   ```
   `http://localhost:3000` でプレビューできます。

2. **コードの編集**:
   - **ページ/画面**: `src/app/` 以下のファイルを編集します。
     - メニュー: `page.tsx`
     - 予約画面: `booking/page.tsx`
     - 休み登録: `rest/page.tsx`
   - **デザイン/CSS**: `src/app/globals.css` を編集します。
   - **コンポーネント**: `src/lib/` や `src/components/` (作成した場合) を編集します。

   編集するとブラウザが自動的にリロードされ、変更が反映されます。

### 2. デプロイ (本番反映)

Vercelを使用しているため、**GitHubにPushするだけで自動的にデプロイされます**。

1. **変更をコミット**:
   ```bash
   git add .
   git commit -m "デザイン修正: ボタンの余白を調整"
   ```

2. **GitHubへPush**:
   ```bash
   git push origin feature/nextjs-migration
   ```
   
   - **Preview Deployment**: ブランチにPushすると、Vercelが「プレビュー環境」を作成します。Pull Request上で確認できます。
   - **Production Deployment**: `main` ブランチにマージされると、本番環境 (`https://next-portal-....vercel.app`) が更新されます。

### 3. 環境変数

本番環境で動作させるには、Vercelのダッシュボードで環境変数を設定する必要があります。
詳細は `NEXT_STEPS.md` を参照してください。
