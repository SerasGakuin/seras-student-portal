# アーキテクチャ設計書 (Architecture Overview)

本プロジェクトは、保守性・拡張性・テスト容易性を高めるために、**Feature-based Architecture**（機能単位のアーキテクチャ）と **Service Layer Pattern**（サービス層パターン）を採用しています。

## 1. ディレクトリ構成と役割
ディレクトリ構成は、Next.js App Router の標準に従いつつ、ビジネスロジックと UI を明確に分離するように設計されています。

```
src/
├── app/                    # Next.js App Router (ルーティング層)
│   ├── api/                # API Route Handlers (HTTPエンドポイント)
│   │   ├── auth/           # 認証関連 (login, [...nextauth])
│   │   ├── booking/        # 予約関連 (reserveMeeting/registerRestDay)
│   │   ├── dashboard/      # ダッシュボード統計 API
│   │   ├── ranking/        # 週間ランキング API
│   │   └── occupancy/      # 混雑状況取得
│   ├── booking/            # 予約画面ページ (Server Components)
│   ├── dashboard/          # 講師用ダッシュボードページ (Client Component)
│   └── occupancy/          # 混雑状況画面ページ
│
├── components/             # 共有 UI コンポーネント
│   ├── ui/                 # 汎用部品 (Button, PageHeader, GlassCard, Skeleton 等)
│   └── providers/          # コンテキストプロバイダー (AuthProvider 等)
│
├── features/               # 機能別モジュール (Domain Drivenに近い分割)
│   ├── booking/            # 予約機能に関わる UI / Components
│   │   └── components/     # TimeRangeSlider などドメイン固有の部品
│   ├── occupancy/          # 混雑状況機能に関わる UI / Components
│   │   └── components/     # OccupancyCard, ChampionsCard, GuideCard など
│   └── dashboard/          # ダッシュボード機能 UI
│       └── components/     # KPICard, RankingWidget, CumulativeGrowthChart, FilterCommandBar など
│
├── hooks/                  # カスタムフック
│   ├── useRole.ts          # ハイブリッド認証 (LINE + Google) ロール判定
│   └── useGoogleAuth.ts    # Google OAuth 状態管理
│
├── services/               # ビジネスロジック層 (Service Layer)
│   ├── studentService.ts   # 生徒データの取得 (Repository経由)
│   ├── calendarService.ts  # カレンダー連携・イベント生成
│   ├── lineService.ts      # LINE Messaging API 連携
│   ├── authService.ts      # 認証ロジック
│   ├── dashboardService.ts # 統計集計・データ加工ロジック
│   └── badgeService.ts     # 週間ランキング・バッジ計算ロジック
│
├── repositories/           # データアクセス層 (Repository Layer)
│   ├── interfaces/         # インターフェース定義 (IStudentRepository)
│   └── googleSheets/       # Google Sheets 実装 (GoogleSheetStudentRepository)
│
├── lib/                    # インフラ/ユーティリティ層
│   ├── api.ts              # フロントエンド用 API クライアント
│   ├── schema.ts           # Zod スキーマ (バリデーション定義)
│   ├── config.ts           # 環境変数・定数管理
│   ├── liff.tsx            # LINE LIFF SDK ラッパー
│   ├── authConfig.ts       # NextAuth.js 設定 (Google OAuth)
│   └── googleSheets.ts     # Google API クライアント初期化
│
├── types/                  # 型定義 (TypeScript Interfaces)
│
└── analysis/               # データ分析 (Python/Jupyter)
    ├── data_loader.ipynb   # データ読み込み・前処理
    ├── visualizer.py       # 可視化ロジック
    └── loader.py           # データロードユーティリティ
```


## 2. 設計思想 (Design Philosophy)

### A. 責務の分離 (Separation of Concerns)
各層の役割を厳密に定義し、依存方向を一方向に限定しています。

1.  **Presentation Layer (`src/app`, `src/features`)**:
    *   **役割**: 画面の描画とユーザー入力の受け付け。
    *   **ルール**: ビジネスロジックを極力書かない。「API クライアントを呼んで、結果を表示する」ことに徹する。
    *   **例**: `OccupancyCard` は表示に専念し、更新操作は `PrincipalControlPanel` が担当する（責務の分離）。
2.  **API Handler Layer (`src/app/api`)**:
    *   **役割**: HTTPリクエストの受付、入力バリデーション (Zod)、レスポンスの返却。
    *   **ルール**: ロジックは書かず、サービス層 (`src/services`) に処理を委譲する。
3.  **Service Layer (`src/services`)**:
    *   **役割**: 具体的な業務処理（「予約可能か判定する」、「滞在時間を計算する」）。
    *   **現状**: データアクセスは **Repository Layer** に委譲し、ビジネス判断に集中する。
4.  **Repository Layer (`src/repositories`)** [NEW]:
    *   **役割**: データの取得・保存（CRUD）を抽象化する。
    *   **構成**: `IStudentRepository` (Interface) と `GoogleSheetStudentRepository` (Implementation) に分離し、将来的なDB移行を容易にしている。
5.  **Infrastracture Layer (`src/lib`)**:
    *   **役割**: 外部システム（Google, LINE）との通信詳細を隠蔽する。

## 3. UI/UX 実装パターン (UI Patterns)

### A. Granular Loading & Skeleton UI (きめ細やかな読み込み)
従来の「ロード中は画面全体を`LoadingOverlay`で覆う」手法は、UXを損なうため廃止しました。
*   **個別更新**: 教室長が開館/閉館操作を行った際、操作された建物のカード**だけ**をスケルトン表示にします。
*   **ダッシュボード**: フィルタ変更時にレイアウトシフト（ガタつき）を起こさないよう、既存データを半透明で残しつつ、更新中であることを示します。`KPICard`には専用の`Skeleton`コンポーネントを使用し、スムーズな視覚体験を提供します。

### B. パフォーマンス最適化 (React.memo)
リアルタイム性を確保するため、`OccupancyPage` は数秒ごとにポーリングを行いますが、以下の対策でチラつき（Flickr）を防止しています。
*   **コンポーネントのメモ化**: `PageHeader` などの静的コンポーネントを `React.memo` でラップし、不要な再レンダリングを阻止。
*   **Propsの定数化**: 親コンポーネントから渡す JSX やオブジェクトを定数 (`const`) として定義。

### C. 型安全性とバリデーション (Zod & TypeScript)
「入力は疑え」の原則に基づき、API の入り口で必ず **Zod** による検証を行います。
*   `src/lib/schema.ts` に全スキーマを集約。
*   型定義 (`src/types`) とスキーマ定義 (`src/lib/schema.ts`) を連携させ、コンパイル時と実行時の両方で安全性を担保します。

### D. 変更への強さ (Robustness)
外部依存（特に Google Sheets）の脆さをコードで吸収しています。
*   **動的カラムマッピング**: スプレッドシートの列順序が変わっても、ヘッダー名（「生徒LINEID」など）で検索するため、プログラムは壊れません。

### E. スタイリングとアクセシビリティ (Styling & Accessibility)
全てのユーザーに快適な体験を提供するため、グローバルなスタイル基盤を整備しています。
*   **CSS Variables**: `globals.css` に色、フォント、影などを一元定義し、ダークモードやコントラスト調整を容易にしています。
*   **Reduced Motion**: OSの「視差効果を減らす」設定を検知し、アニメーションを自動的に無効化するメディアクエリをグローバルに適用しています。
*   **Form Accessibility**: 入力フォーム (`FormGroup`) は `role="alert"` を利用したインラインエラー表示をサポートし、スクリーンリーダーに対応しています。

## 4. データフロー

例：**生徒が面談予約をする場合**

1.  **UI**: ユーザーが日付を選択し「予約」ボタンを押す。
2.  **Client**: `api.booking.reserveMeeting(...)` を呼び出す。
3.  **API Route**: `/api/reserveMeeting` がリクエストを受信。
    *   Zod で `BookingRequest` スキーマと照合。不正なら即座に 400 エラー。
4.  **Service**: `calendarService.createMeetingEvent(...)` を呼び出す。
    *   空き状況を確認（将来実装予定）。
    *   Google Calendar API を叩いてイベント作成。
5.  **Service**: `lineService.sendPushMessage(...)` を呼び出す。
    *   生徒に完了通知を送る。
6.  **Response**: UI に成功 (`{ status: 'ok' }`) を返す。

## 5. 認証と権限 (Authentication & Authorization)

本システムでは、**ハイブリッド認証**（LINE LIFF + Google OAuth）を採用し、クライアントサイドとサーバーサイドで統一された認証モデルを実現しています。

### 概要

| 認証方式 | 対象 | 用途 |
| :--- | :--- | :--- |
| **LINE LIFF** | 生徒・講師・教室長 | スマートフォンからのアクセス |
| **Google OAuth** | 講師・教室長 | PCブラウザからのダッシュボードアクセス |

### 主要コンポーネント

| コンポーネント | 役割 |
| :--- | :--- |
| `src/lib/authUtils.ts` | サーバーサイド認証の一元管理 |
| `src/hooks/useRole.ts` | クライアントサイドの権限判定フック |
| `src/lib/authConfig.ts` | NextAuth.js 設定 (Google OAuth) |

### 詳細ドキュメント

認証・権限システムの詳細（ユーザーロール、APIアクセスマトリクス、実装パターン）については **[権限システム (permissions.md)](./permissions.md)** を参照してください。

## 6. 自動化プロセス (Automation)

### A. 自動閉館 (Auto-Close Cron)
Vercel Cron Jobs を利用して、毎日23:00に自動実行されるジョブを設定しています。
*   **目的**: 閉館忘れ防止。

## 7. パフォーマンスとキャッシュ (Performance & Caching)

### A. 混雑状況データのキャッシュ
Google Sheets API の Rate Limit 回避とレスポンス向上を目的に、`occupancyService` 層でキャッシュを実装しています。
*   **技術**: Next.js `unstable_cache`
*   **有効期限**: 30秒 (`revalidate: 30`)
*   **スコープ**: 全ユーザー共通のシートデータ (`occupancy-raw-sheet-data`)
*   **無効化**: 教室長による `updateBuildingStatus` 実行時に `revalidateTag` で即時無効化し、UIへの反映遅延を防いでいます。
