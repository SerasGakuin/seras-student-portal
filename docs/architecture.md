# アーキテクチャ設計書 (Architecture Overview)

本プロジェクトは、保守性・拡張性・テスト容易性を高めるために、**Feature-based Architecture**（機能単位のアーキテクチャ）と **Service Layer Pattern**（サービス層パターン）を採用しています。

## 1. ディレクトリ構成と役割
ディレクトリ構成は、Next.js App Router の標準に従いつつ、ビジネスロジックと UI を明確に分離するように設計されています。

```
seras-student-portal/
├── analysis/               # データ分析 (別Python環境)
│   ├── notebooks/          # Jupyter Notebooks (occupancy_analysis, open_analysis)
│   ├── src/seras_analysis/ # 分析用Pythonモジュール
│   ├── pyproject.toml      # uv によるPython依存管理
│   └── .venv/              # 仮想環境
│
├── src/
│   ├── app/                    # Next.js App Router (ルーティング層)
│   │   ├── api/                # API Route Handlers (HTTPエンドポイント)
│   │   │   ├── auth/           # 認証関連 (login, [...nextauth])
│   │   │   ├── cron/           # Cronジョブ (auto-close, remind-open, fill-exit-time)
│   │   │   ├── dashboard/      # ダッシュボード統計 API
│   │   │   ├── occupancy/      # 混雑状況取得
│   │   │   ├── ranking/        # 週間ランキング API
│   │   │   ├── registerRestDay/# 休講登録 API
│   │   │   └── reserveMeeting/ # 面談予約 API
│   │   ├── booking/            # 予約画面ページ (Server Components)
│   │   ├── dashboard/          # 講師用ダッシュボードページ (Client Component)
│   │   └── occupancy/          # 混雑状況画面ページ
│   │
│   ├── components/             # 共有 UI コンポーネント
│   │   ├── ui/                 # 汎用部品 (Button, PageHeader, GlassCard, Skeleton 等)
│   │   └── providers/          # コンテキストプロバイダー (AuthProvider 等)
│   │
│   ├── features/               # 機能別モジュール (Domain Drivenに近い分割)
│   │   ├── booking/            # 予約機能に関わる UI / Components
│   │   │   └── components/     # TimeRangeSlider などドメイン固有の部品
│   │   ├── occupancy/          # 混雑状況機能に関わる UI / Components
│   │   │   └── components/     # OccupancyCard, ChampionsCard, GuideCard など
│   │   └── dashboard/          # ダッシュボード機能 UI
│   │       └── components/     # KPICard, RankingWidget, CumulativeGrowthChart など
│   │
│   ├── hooks/                  # カスタムフック
│   │   ├── useRole.ts          # ハイブリッド認証 (LINE + Google) ロール判定
│   │   └── useGoogleAuth.ts    # Google OAuth 状態管理
│   │
│   ├── services/               # ビジネスロジック層 (Service Layer)
│   │   ├── studentService.ts   # 生徒データの取得 (Repository経由)
│   │   ├── occupancyService.ts # 混雑状況の取得・更新
│   │   ├── calendarService.ts  # カレンダー連携・イベント生成
│   │   ├── lineService.ts      # LINE Messaging API 連携
│   │   ├── authService.ts      # 認証ロジック
│   │   ├── dashboardService.ts # 統計集計・データ加工ロジック
│   │   ├── badgeService.ts     # 週間ランキング・バッジ計算ロジック
│   │   ├── exitTimeFillService.ts # 退室時刻自動補完ロジック
│   │   └── nightlyService.ts   # 夜間バッチ処理統合サービス
│   │
│   ├── repositories/           # データアクセス層 (Repository Layer)
│   │   ├── interfaces/         # インターフェース定義 (IStudentRepository, IOccupancyRepository)
│   │   └── googleSheets/       # Google Sheets 実装 (GoogleSheetStudentRepository 等)
│   │
│   ├── lib/                    # インフラ/ユーティリティ層
│   │   ├── api.ts              # フロントエンド用 API クライアント
│   │   ├── schema.ts           # Zod スキーマ (バリデーション定義)
│   │   ├── config.ts           # 環境変数・定数管理
│   │   ├── liff.tsx            # LINE LIFF SDK ラッパー
│   │   ├── authConfig.ts       # NextAuth.js 設定 (Google OAuth)
│   │   ├── authUtils.ts        # サーバーサイド認証ユーティリティ
│   │   ├── googleSheets.ts     # Google API クライアント初期化
│   │   ├── dateUtils.ts        # JST日付処理ユーティリティ
│   │   ├── durationUtils.ts    # 滞在時間計算ユーティリティ
│   │   ├── stringUtils.ts      # 文字列処理ユーティリティ
│   │   ├── apiHandler.ts       # APIハンドラー共通処理
│   │   └── cacheConfig.ts      # キャッシュ設定の一元管理
│   │
│   └── types/                  # 型定義 (TypeScript Interfaces)
│       ├── index.ts            # 共通型定義
│       ├── badge.ts            # バッジ・ランキング関連型
│       └── dashboard.ts        # ダッシュボード関連型
│
└── scripts/                # 開発・運用スクリプト
```


## 2. 設計思想

### A. レイヤー構成と責務の分離

コードの保守性を高めるため、各層の役割を明確に分けています。上位層は下位層にのみ依存し、逆方向の依存は禁止です。

| 層 | ディレクトリ | 責務 |
| :--- | :--- | :--- |
| **表示層** | `src/app`, `src/features` | 画面の描画とユーザー操作の受け付け。ビジネスロジックは書かない |
| **API層** | `src/app/api` | HTTPリクエストの受付、Zodによる入力検証、サービス層への委譲 |
| **サービス層** | `src/services` | 業務ロジック（滞在時間計算、バッジ判定、統計集計など） |
| **リポジトリ層** | `src/repositories` | データアクセスの抽象化。インターフェースと実装を分離 |
| **インフラ層** | `src/lib` | 外部システム（Google API, LINE SDK）との通信を隠蔽 |

**リポジトリパターンの採用**:
データアクセスをインターフェース（`IStudentRepository`, `IOccupancyRepository`）で抽象化し、現在はGoogle Sheets実装（`GoogleSheetStudentRepository`等）を使用しています。将来的にデータベースへ移行する場合も、サービス層のコードを変更せずに済みます。

## 3. UI/UX 実装パターン

### A. 読み込み表示の工夫

画面全体をローディングで覆うのではなく、更新が必要な部分だけを個別に処理します。

| 場面 | 実装 |
| :--- | :--- |
| **初回読み込み** | `Skeleton` コンポーネントでコンテンツの形を保ったプレースホルダーを表示 |
| **フィルタ変更時** | 既存データを半透明（`opacity: 0.5`）で残し、レイアウトのガタつきを防止 |
| **個別操作時** | 開館/閉館操作では、操作対象のカードのみスケルトン表示 |

### B. 再レンダリングの抑制

混雑状況ページは数秒ごとにデータを取得しますが、画面のちらつきを防ぐため以下の対策をしています。

- **`React.memo` の活用**: `PageHeader`, `OccupancyCard` など、頻繁に変わらないコンポーネントをメモ化
- **Props の安定化**: 親から渡すオブジェクトや関数を `useMemo`, `useCallback` で固定

### C. 入力検証と型安全性

「外部からの入力は信用しない」という方針で、APIの入り口で必ず検証を行います。

- **Zod スキーマ**: `src/lib/schema.ts` に全APIリクエストのスキーマを集約
- **TypeScript 連携**: Zodスキーマから型を生成し、コンパイル時と実行時の両方で安全性を確保

### D. 外部依存への対策

Google Sheetsのデータ構造変更に強い設計にしています。

- **動的カラムマッピング**: 列の順序ではなく、ヘッダー名（「生徒LINEID」等）で列を特定するため、スプレッドシートの列を並び替えてもコードは動作します

### E. アクセシビリティ

- **CSS Variables**: `globals.css` で色・フォント・影を一元管理し、コントラスト調整を容易に
- **アニメーション制御**: OSの「視差効果を減らす」設定を検知し、`prefers-reduced-motion` でアニメーションを無効化
- **フォームのエラー表示**: `FormGroup` コンポーネントは `role="alert"` でスクリーンリーダーに対応

## 4. データフローの例

**面談予約の流れ**:

```
[UI] 日付選択・予約ボタン押下
  ↓
[APIクライアント] api.booking.reserveMeeting() を呼び出し
  ↓
[API Route] /api/reserveMeeting でリクエスト受信
  ├─ Zod で入力検証（不正なら 400 エラー）
  ↓
[Service] calendarService.createMeetingEvent()
  ├─ Google Calendar API でイベント作成
  ↓
[Service] lineService.pushMessage()
  ├─ 生徒に完了通知を送信
  ↓
[Response] { status: 'ok' } を返却
```

## 5. 認証と権限

本システムでは **LINE LIFF** と **Google OAuth** を組み合わせたハイブリッド認証を採用しています。

| 認証方式 | 対象ユーザー | 用途 |
| :--- | :--- | :--- |
| **LINE LIFF** | 生徒・講師・教室長 | スマートフォンからのアクセス |
| **Google OAuth** | 講師・教室長 | PCブラウザからのダッシュボードアクセス |

**関連ファイル**:
- `src/lib/authUtils.ts` - サーバーサイド認証の一元管理
- `src/hooks/useRole.ts` - クライアントサイドの権限判定
- `src/lib/authConfig.ts` - NextAuth.js 設定

詳細は **[権限システム (permissions.md)](./permissions.md)** を参照。

## 6. 自動化（Cron Jobs）

Vercel Cron Jobs で以下のジョブを定期実行しています。
（Vercel無料プランは最大2つのCronに制限されるため、23:00の処理は統合）

| ジョブ | 実行時刻 (JST) | 目的 |
| :--- | :--- | :--- |
| **夜間バッチ** (`/api/cron/nightly`) | 毎日 23:00 | 自動閉館＋退室時刻補完＋LINE通知 |
| **開館リマインダー** (`/api/cron/remind-open`) | 毎日 14:30 | 2号館が未開館なら教室長にLINE通知 |

### 夜間バッチ処理の詳細

`/api/cron/nightly` は `NightlyService` を使用して以下の処理を順次実行:

1. **自動閉館**: 2号館が開館中なら自動で閉館
2. **退室時刻補完**: 退室忘れの生徒に対して退室時刻を補完＋LINE通知

各処理は独立しており、一方が失敗しても他方は継続します。

### 退室時刻補完の詳細

退室記録を忘れた生徒のログに対して、過去7日間の平均滞在時間を基に退室時刻を自動補完します。

**補完ロジック**:
1. **個人平均**: 過去7日間の通塾日における平均滞在時間を使用
2. **全体平均**: 個人データがない場合は全生徒の平均を使用
3. **デフォルト**: 全体データもない場合は3時間（初日など）
4. **上限**: 22:00 JST を超えないようにクリップ

**LINE通知**: 補完対象の生徒には自動で注意喚起メッセージを送信します（LINE ID がある場合のみ）。

## 7. キャッシュ戦略

Google Sheets API のレート制限を回避し、レスポンスを高速化するためキャッシュを導入しています。

**技術**: Next.js `unstable_cache` + `revalidateTag`

| 対象 | キャッシュ箇所 | 有効期限 |
| :--- | :--- | :--- |
| 生徒マスター | `GoogleSheetStudentRepository` | 30秒 |
| 入退室ログ | `GoogleSheetOccupancyRepository` | 1時間 |
| 混雑状況 | `occupancyService` | 10秒 |

**即時無効化**: 教室長が開館/閉館操作を行うと、`revalidateTag` でキャッシュを即時無効化し、UIに最新状態を反映します。

## 8. 共通ユーティリティ

コードの重複を排除し、保守性を高めるため、以下の共通ユーティリティを `src/lib/` に集約しています。

### A. 日付処理 (`dateUtils.ts`)

JST（日本標準時）を扱う処理を一元化。複数のサービスで同じロジックが重複していた問題を解消。

| 関数 | 用途 |
| :--- | :--- |
| `toJst(date)` | Date を JST に変換 |
| `toJstDateString(date)` | `YYYY/M/D` 形式の文字列を生成 |
| `toJstMonthString(date)` | `YYYY-MM` 形式の文字列を生成 |
| `getJstTimestamp()` | 現在時刻の JST タイムスタンプを取得 |
| `getJstDayOfWeek()` | JST の曜日を取得（0=日, 6=土） |
| `isEntryToday(entryTime)` | 入室時刻が今日かどうか判定 |
| `formatTimeJst(dateString)` | 時刻を `HH:MM` 形式で取得 |
| `setStartOfDay(date)` | 日の開始時刻（00:00:00.000）を設定 |
| `setEndOfDay(date)` | 日の終了時刻（23:59:59.999）を設定 |
| `filterLogsByDateRange(logs, start, end)` | 日付範囲でログをフィルタリング |

### B. 滞在時間計算 (`durationUtils.ts`)

重複する時間帯をマージして正確な滞在時間を計算するロジックを集約。

| 関数 | 用途 |
| :--- | :--- |
| `getEffectiveExitTime(log)` | 退室時刻を取得（未退室時は現在時刻を返す）※ 23:00のCronで補完済み |
| `mergeIntervalsAndSum(intervals)` | 重複区間をマージして合計時間を算出 |
| `calculateEffectiveDuration(logs)` | ログ配列から実効滞在時間（分）を計算 |
| `calculateDurationInTimeRange(logs, start, end, toJst)` | 指定時間帯のみの滞在時間を計算 |
| `calculateSingleLogDuration(log)` | 単一ログの滞在時間（分）を計算 |

**注意**: `getEffectiveExitTime` は毎日23:00に実行される `/api/cron/fill-exit-time` により、
未退室ログには退室時刻が補完されている前提で設計されています。同日のリアルタイム表示では
現在時刻が使用されます。

### C. APIハンドラー (`apiHandler.ts`)

API Route のボイラープレートを削減し、エラーハンドリング・認証・認可を統一。

| 関数 | 用途 |
| :--- | :--- |
| `successResponse(data)` | `{ status: 'ok', data }` 形式のレスポンスを生成 |
| `errorResponse(message, status)` | エラーレスポンスを生成 |
| `extractErrorMessage(error)` | エラーオブジェクトからメッセージを抽出 |
| `validateCronRequest(req, context)` | Cron認証チェック（`CRON_SECRET` 検証） |
| `withErrorHandler(context)` | try-catch によるエラーハンドリングをラップ |
| `withAuth(context)` | 認証チェックを自動化 |
| `withPermission(context, permission)` | 認証 + 権限チェックを自動化 |

**使用例**:
```typescript
export const GET = withPermission('Dashboard Stats', 'canViewDashboard')(
    async (request) => {
        const stats = await service.getDashboardStats();
        return successResponse(stats);
    }
);
```

### D. 文字列処理 (`stringUtils.ts`)

名前の正規化など、文字列処理を一元化。

| 関数 | 用途 |
| :--- | :--- |
| `normalizeName(name)` | 名前の正規化（空白・ゼロ幅文字を除去） |

**対応する文字**:
- 通常の空白（半角・全角スペース、タブ、改行）
- ゼロ幅文字（U+200B-U+200D, U+FEFF）

**使用例**:
```typescript
normalizeName('田中 太郎'); // → '田中太郎'
normalizeName('佐藤\u200B花子'); // → '佐藤花子'
```

### E. キャッシュ設定 (`cacheConfig.ts`)

`unstable_cache` の設定値を一元管理し、変更を容易に。

```typescript
// 使用例
import { CACHE_CONFIG, CACHE_TAGS } from '@/lib/cacheConfig';

const cachedFetch = unstable_cache(
    async () => { /* ... */ },
    CACHE_CONFIG.OCCUPANCY_STATUS.keys,
    { revalidate: CACHE_CONFIG.OCCUPANCY_STATUS.revalidate }
);
```

## 9. 型定義の構成

型定義は `src/types/` に集約し、機能ごとにファイルを分割しています。

| ファイル | 内容 |
| :--- | :--- |
| `index.ts` | 共通型（`ApiResponse`, `Student`, `Grade` 等）と各ファイルの re-export |
| `badge.ts` | バッジ関連（`BadgeType`, `Badge`, `UnifiedWeeklyBadges`） |
| `dashboard.ts` | ダッシュボード関連（`StudentStats`, `DashboardSummary`） |
