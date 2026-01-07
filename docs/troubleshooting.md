# トラブルシューティング (Troubleshooting)

よくある問題と解決方法を記載しています。

## 認証・ログイン

### LINE認証が失敗する

**症状**: LINEアプリからアクセスしても認証されない

**確認ポイント**:
1. LIFF IDが正しく設定されているか確認 (`NEXT_PUBLIC_LIFF_ID`)
2. LINEの開発者コンソールでドメインが許可されているか確認
3. ブラウザのコンソールで `liff.init()` のエラーを確認

```bash
# 環境変数の確認
echo $NEXT_PUBLIC_LIFF_ID
```

### Google OAuth でダッシュボードにアクセスできない

**症状**: Googleログイン後、403エラーになる

**原因**: 許可されたメールアドレスリストに含まれていない

**解決方法**:
1. 環境変数 `ALLOWED_EMAILS` にメールアドレスを追加
2. Vercelにデプロイしている場合は環境変数を更新後、再デプロイ

```env
ALLOWED_EMAILS=user1@gmail.com,user2@gmail.com
```

---

## データ表示

### 生徒データが古い / 更新されない

**症状**: スプレッドシートを更新したがアプリに反映されない

**原因**: キャッシュが有効

**解決方法**:
- 通常は30秒〜1分で自動更新されます
- 開館/閉館操作を行うとキャッシュが即時無効化されます
- 緊急時はVercelの再デプロイでキャッシュクリア

### ランキングに特定の生徒が表示されない

**確認ポイント**:
1. 生徒マスターの `status` が `在塾` であること
2. 該当期間に入退室ログが存在すること
3. 生徒名がスプレッドシートと完全一致していること（空白文字注意）

```typescript
// 名前の正規化ロジック
const normalizeName = (name: string) => name.replace(/[\s\u200B-\u200D\uFEFF]/g, '').trim();
```

### 滞在時間が異常に長い

**症状**: 24時間などの異常な滞在時間が記録されている

**原因**: 退室時刻が未入力

**自動補正ロジック**:
- 入室から12時間未満: 現在時刻を仮の退室時刻として計算
- 入室から12時間以上: `MIN(入室+4時間, 当日22:00)` で補正

### EARLY_BIRD が付与されるべき生徒に付かない

**確認ポイント**:
1. 4:00〜9:00 の滞在時間が30分以上あるか
2. 深夜0:00〜3:59は対象外（4:00開始）
3. 複数ログがある場合、オーバーラップが正しくマージされているか

---

## API エラー

### 401 Unauthorized

**原因**: 認証情報がない

**解決方法**:
- LINE認証: `x-line-user-id` ヘッダーが送信されているか確認
- Google認証: NextAuth セッションが有効か確認

### 403 Forbidden

**原因**: 認証はされているが権限がない

**確認ポイント**:
1. 生徒マスターの `status` 値を確認
2. `docs/permissions.md` のAPIアクセスマトリクスを確認
3. 該当APIに必要な権限を持っているか確認

### 500 Internal Server Error

**確認ポイント**:
1. Vercelのログで詳細なエラーメッセージを確認
2. Google Sheets API の認証情報が有効か確認
3. スプレッドシートのカラム構成が変わっていないか確認

```bash
# Vercelログの確認
vercel logs <deployment-url>
```

---

## 開発環境

### テストが失敗する

**症状**: `npm test` でエラー

**よくある原因と解決方法**:

1. **日付関連のテスト失敗**
   - `jest.useFakeTimers()` が設定されているか確認
   - テスト後に `jest.useRealTimers()` でリセット

2. **モックが正しく動作しない**
   - `jest.isolateModules()` パターンを使用しているか確認
   - `beforeEach` で `jest.clearAllMocks()` を呼んでいるか確認

```typescript
beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2025-12-25T10:00:00'));
});

afterEach(() => {
    jest.useRealTimers();
});
```

### 型エラー

**症状**: TypeScriptのコンパイルエラー

**確認ポイント**:
1. `npm install` で依存関係が最新か確認
2. `tsconfig.json` のパスエイリアス設定を確認
3. `src/types/` の型定義を確認

---

## デプロイ

### Vercel ビルドエラー

**確認ポイント**:
1. ローカルで `npm run build` が成功するか確認
2. 必要な環境変数がVercelに設定されているか確認
3. `next.config.js` の設定を確認

### Cron ジョブが実行されない

**確認ポイント**:
1. `vercel.json` の cron 設定を確認
2. Vercelダッシュボードでcron実行ログを確認
3. cronエンドポイントに `CRON_SECRET` が設定されているか確認

```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/auto-close",
    "schedule": "0 14 * * *"
  }]
}
```

---

## お問い合わせ

上記で解決しない場合は、以下の情報を添えてご連絡ください:

1. 発生した問題の詳細な説明
2. 再現手順
3. ブラウザのコンソールログ
4. Vercelのデプロイログ（該当する場合）
