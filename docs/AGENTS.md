# AIエージェント向けガイドライン

本ファイルは、AIエージェント（Cursor、Copilot、Antigravity、Claude等）がこのリポジトリで作業する際の規則を定義します。

## ルール1: 仕様書駆動開発 (Spec-First)

コードの実装を始める前に、**必ず**仕様を先に更新してください。

1. **型/スキーマの定義**: `src/lib/schema.ts` (Zod) と `src/types/index.ts` を更新
2. **API仕様の更新**: `docs/api-spec.md` を更新
3. **実装**: 上記が完了してから、実際のコードを書く

## ルール2: ドキュメント同期

コードとドキュメントは**常に**同期を保ってください。

| 変更内容 | 更新するドキュメント |
| :--- | :--- |
| 環境変数の追加 | `docs/setup.md` |
| ディレクトリ構成の変更 | `docs/architecture.md` |
| DBスキーマの変更 | `docs/database.md` |
| APIの追加/変更 | `docs/api-spec.md` |
| 権限ルールの変更 | `docs/permissions.md` |
| バッジロジックの変更 | `docs/specs/dashboard-spec.md` |

## ルール3: 技術スタック

| 項目 | 技術 |
| :--- | :--- |
| **フレームワーク** | Next.js 16 (App Router) |
| **言語** | TypeScript |
| **認証** | LINE LIFF v2 / NextAuth.js (Google OAuth) |
| **バリデーション** | Zod（厳格なバリデーション必須） |
| **テスト** | Jest（サービス層のユニットテストは**必須**） |

## ルール4: アーキテクチャ制約

- **UIコンポーネントにビジネスロジックを書かない**: `src/services` に委譲する
- **`fetch` を直接呼ばない**: `src/lib/api.ts` を使用する
- **データアクセスはリポジトリ経由**: `src/repositories` を使用する
- **認証チェックは `authUtils` を使用**: 直接 `getServerSession` を呼ばない

## ルール5: テストの書き方

新しいサービスやAPIを追加した場合、対応するテストを追加してください。

```bash
# テストの実行
npm test

# 特定のファイルをテスト
npm test -- badgeService
```

**テストパターン**:
- サービス層: `jest.isolateModules` でモジュールを再評価
- 日付依存: `jest.useFakeTimers()` でシステム時刻を固定
- 認証テスト: `next-auth` と `studentService` をモック

詳細は `docs/testing.md` を参照。

## ルール6: コミットメッセージ

コミットメッセージは [Conventional Commits](https://www.conventionalcommits.org/) 形式に従ってください。

```
feat: 新機能の追加
fix: バグ修正
docs: ドキュメントのみの変更
style: コードの意味に影響しない変更（空白、フォーマット等）
refactor: バグ修正でも機能追加でもないコード変更
test: テストの追加・修正
chore: ビルドプロセスやツールの変更
```

## ルール7: 禁止事項

- ハードコードされた機密情報（APIキー、パスワード等）のコミット
- `console.log` のデバッグコードを本番コードに残すこと
- 型の `any` の濫用（必要な場合は `eslint-disable` でコメント必須）
- テストなしでの複雑なロジックの追加
