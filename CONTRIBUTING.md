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
