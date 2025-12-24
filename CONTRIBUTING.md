# Contributing Guide

Seras学院生徒ポータルへの貢献ガイドです。

## 開発プロセス (Development Process)

### 1. 仕様書駆動 (Spec-First)
実装を始める前に、必ずドキュメントと型定義を更新してください。
- `docs/api-spec.md`
- `src/lib/schema.ts` (Zod Schema)

### 2. 品質保証 (QA)
本リポジトリでは `husky` により、コミット時に自動テストが実行されます。
- `npm run lint` (ESLint)
- `npm test` (Jest)
これらが通らない場合、コミットは拒否されます。

### 3. プルリクエスト (Pull Request)
PR作成時には、自動挿入されるテンプレートに従って、ドキュメントの更新漏れがないか確認してください。

### 4. AIとの協働
AIツール (Antigravity 等) を使用する場合は、リポジトリ内の `.agent/rules` や `docs/AGENTS.md` の指示に従わせてください。
基本ルール： **「コードを変えたら、ドキュメントも変える」**

### 5. UI/UX ガイドライン
UIの実装や修正を行う際は、以下の基準を遵守してください。
- **アクセシビリティ**: WCAG AA (コントラスト比 4.5:1以上) を維持すること。
- **スタイリング**: Global CSS Variables (`globals.css`) を活用し、ハードコードされた色を使用しないこと。
- **モーション**: `prefers-reduced-motion` を尊重し、アニメーションには必ずメディアクエリを適用すること。
- **AI活用**: デザインの意思決定には `.agent/workflows/ui-ux-pro-max.md` のワークフローを活用可能です。詳細なリソースは `.shared/ui-ux-pro-max/` にあります。
