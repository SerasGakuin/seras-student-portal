# Seras学院 生徒用ポータル (Seras Student Portal)

## 概要
Seras学院の生徒学習支援を目的としたWebアプリケーションのソースコードリポジトリです。
**Next.js (App Router)** を基盤とし、**LINE Front-end Framework (LIFF)** によるシームレスな認証、**Google Workspace** (Calendar/Sheets) と連携したデータ管理を実現しています。

本プロジェクトは、スケーラビリティと保守性を重視し、TypeScriptによる型安全性と機能単位のアーキテクチャを採用しています。

## 主な機能
- **LINE統合認証**: LINEアカウントを利用したシングルサインオン (SSO) で、生徒はストレスなくログイン可能です。
- **リアルタイム在室モニタリング**: 自習室（本館・2号館）の利用状況を可視化します。
- **予約管理システム**: 面談予約や欠席連絡をWeb上で行い、Googleカレンダーと自動同期します。
- **講師・教室長モード**: 講師による生徒検索、教室長による自習室の開館/閉館管理機能（権限ベースのUI切り替え）。

## ドキュメント
開発者向けの詳細ドキュメントは `docs/` ディレクトリに格納されています。

- **[環境構築ガイド](./docs/setup.md)**: 開発環境のセットアップとインストール手順。
- **[アーキテクチャ](./docs/architecture.md)**: システム設計、レイヤー構造、技術スタック。
- **[API仕様書](./docs/api-spec.md)**: APIエンドポイントとデータスキーマ。
- **[データベース定義](./docs/database.md)**: Google Sheetsのカラム定義。
- **[テストガイド](./docs/testing.md)**: テストの実行方法と方針。
- **[デプロイ](./docs/deployment.md)**: Vercelへのデプロイ手順とAnalytics設定。
- **[開発ガイド (AI/Contributing)](./CONTRIBUTING.md)**: 開発フローとAIエージェントへの指示。

## クイックスタート

```bash
# リポジトリのクローン
git clone <repository-url>

# 依存パッケージのインストール
npm install

# 環境変数の設定 (詳細は setup.md を参照)
cp .env.example .env.local

# 開発サーバーの起動
npm run dev
```

詳細なセットアップ手順や必要な環境変数については、**[環境構築ガイド](./docs/setup.md)** を参照してください。

## 技術スタック
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Auth**: LINE LIFF v2
- **Data**: Google Sheets API, Google Calendar API
- **Analytics**: Vercel Analytics
- **Testing**: Jest
- **Validation**: Zod
