# 分析機能 開発ガイド

新しい分析タイプを追加する際の手順・方針・教訓をまとめたドキュメント。

## アーキテクチャ概要

```
src/
├── types/analysis.ts              # 全分析の型定義（ここに追加）
├── services/
│   ├── analysisService.ts         # 在室状況分析のサービス層
│   ├── analysisService.test.ts    # そのテスト
│   ├── rankingAnalysisService.ts  # 月間ランキング分析のサービス層
│   └── <newType>AnalysisService.ts  # ← 新分析はサービスを分ける
├── app/
│   ├── analysis/page.tsx          # 統一ページ（分析タイプで切り替え）
│   └── api/analysis/
│       ├── occupancy/route.ts     # 在室状況 API
│       ├── ranking/route.ts       # 月間ランキング API
│       └── <newType>/route.ts     # ← 新分析は別ルート
├── features/analysis/components/
│   ├── AnalysisSelector.tsx       # 分析タイプ選択（ANALYSIS_TYPES 配列）
│   ├── AnalysisDateRange.tsx      # 日付範囲（共通パラメータ）
│   ├── MonthSelector.tsx          # 月選択（ランキング用）
│   ├── ChartContainer.tsx         # PNG DL付きラッパー（共通）
│   ├── OccupancyHeatmap.tsx       # 在室状況専用
│   ├── DailyTrendsChart.tsx       # 在室状況専用
│   ├── DailyBreakdownChart.tsx    # 在室状況専用
│   ├── RankingPdfView.tsx         # 月間ランキングPDF（表彰台レイアウト）
│   └── RankingPdfView.module.css  # PDF用CSS（直値指定、CSS変数不使用）
├── lib/
│   ├── api.ts                     # API クライアント
│   ├── formatUtils.ts             # 分→時間表示の共通ユーティリティ
│   └── dateUtils.ts               # 日付・通塾日数の共通ユーティリティ
└── lib/__tests__/
    ├── formatUtils.test.ts        # formatUtils のテスト
    └── dateUtils.test.ts          # dateUtils のテスト
```

## 新しい分析タイプを追加する手順

### 1. 型定義 (`src/types/analysis.ts`)

レスポンス型を追加する。既存の型と同じファイルに置く。

```typescript
// 例: 出席分析
export interface AttendanceAnalysisData {
  // ...
  period: { from: string; to: string };
  totalDays: number;
}
```

### 2. サービス層

**ファイルを分ける**。`analysisService.ts` は在室状況専用として、新分析は `<newType>AnalysisService.ts` にする。理由:
- 1ファイルに集計ロジックを詰め込むと肥大化する
- テストもサービス単位で分離した方が管理しやすい
- `unstable_cache` のキーが衝突しないよう注意

集計関数は **pure function として export** し、テストではモックなしで直接テストする（現在の `aggregateHeatmap` 等と同じパターン）。

### 3. API ルート (`src/app/api/analysis/<newType>/route.ts`)

```typescript
import { withPermission, successResponse, validationErrorResponse } from '@/lib/apiHandler';

export const GET = withPermission('Analysis <NewType>', 'canViewDashboard')(
  async (request) => {
    // from/to パラメータの取得・バリデーション
    // サービス呼び出し
    // successResponse(data)
  }
);
```

権限は `canViewDashboard` を再利用する（新しい権限は追加しない方針）。

### 4. API クライアント (`src/lib/api.ts`)

`api.analysis` オブジェクトにメソッドを追加する。

### 5. AnalysisSelector にエントリ追加

`src/features/analysis/components/AnalysisSelector.tsx` の `ANALYSIS_TYPES` 配列に追加するだけ。

```typescript
const ANALYSIS_TYPES: AnalysisType[] = [
  { id: 'occupancy', name: '在室状況分析', ... },
  { id: 'attendance', name: '出席分析', description: '...', icon: <UserCheck size={24} /> },
];
```

### 6. チャートコンポーネント

`src/features/analysis/components/` に新分析専用のチャートを追加。`ChartContainer` で包むと自動的に PNG DL ボタンが付く。

### 7. page.tsx を更新

`analysisType` の値に応じてデータ取得とレンダリングを切り替える。現在の構造は在室状況にハードコードされているので、分析タイプが増えたタイミングで **分析タイプ別の結果コンポーネント** に分離するとよい。

```typescript
// 例: 将来の構造
{analysisType === 'occupancy' && <OccupancyResults data={...} />}
{analysisType === 'attendance' && <AttendanceResults data={...} />}
```

### 8. テスト

- **サービス層ユニットテスト**: pure function をテスト。モック不要。
- **API 統合テスト**: 権限チェック (401/403/200) + パラメータバリデーション (400)。
- 既存のテストパターン (`analysis-api.test.ts`) をコピーして改変するのが最速。

### 9. ドキュメント

- `docs/api-spec.md` にエンドポイント追加
- `docs/permissions.md` のアクセスマトリクスに行追加

---

## 共通ユーティリティ（DRY）

### 時間表示 (`src/lib/formatUtils.ts`)

分数→時間表示の変換は全コンポーネント共通。**`Math.floor(x/60)` + `x%60` を直接書かない**。

```typescript
import { splitMinutes, formatMinutesHm, formatMinutesHoursOnly } from '@/lib/formatUtils';

// JSX内で時間・分を個別にスタイリングしたい場合
const { hours, mins } = splitMinutes(totalMinutes);
// → { hours: 2, mins: 5 }

// 文字列が必要な場合（tooltip、title属性など）
formatMinutesHm(125);          // → "2h 5m"

// 時間のみ（バッジの表示値など）
formatMinutesHoursOnly(125);   // → "2h"
```

使用箇所: RankingPdfView, RankingWidget, RankingDetailView, StudentStatsView, RankerListCard, ActivityHeatmap, dashboard/page.tsx, badgeService

### 通塾日数カウント (`src/lib/dateUtils.ts`)

JST基準のユニーク通塾日数カウントも共通化済み。**手動で Set を構築しない**。

```typescript
import { countUniqueVisitDays, getUniqueVisitDaySet } from '@/lib/dateUtils';

// 日数だけ必要な場合
const days = countUniqueVisitDays(studentLogs);  // number

// Set<string> が必要な場合（badgeServiceのvisitDays等）
const daySet = getUniqueVisitDaySet(studentLogs);  // Set<string>
```

入力型は `{ entryTime: string }[]` で、`EntryExitLog` に依存しない。内部で `toJstDateString()` を使用。

使用箇所: rankingAnalysisService, badgeService, dashboardService

---

## 教訓・注意点

### Recharts の型

Tooltip の `formatter` は `(value: number | undefined, name: string | undefined)` で受ける。`number` と書くと TypeScript ビルドで落ちる。

### useGoogleAuth フック

`session` プロパティは存在しない。使えるのは `isAuthenticated`, `isLoading`, `user`, `signInWithGoogle`, `signOutFromGoogle` のみ。分析ページで Google セッション情報が必要な場面はない（`useRole()` + `useLiff()` で足りる）。

### Google Auth の統合テスト

`isEmailAllowed` (from `@/lib/authConfig`) をモックしないと、テスト環境では `ALLOWED_EMAILS` が空なのでGoogle認証テストが 401 になる。モック構成:

```typescript
jest.mock('next-auth', () => ({
  getServerSession: jest.fn().mockResolvedValue(null),
}));
jest.mock('@/lib/authConfig', () => ({
  authOptions: {},
  isEmailAllowed: jest.fn().mockReturnValue(false),
}));
// テスト内で:
mockIsEmailAllowed.mockReturnValue(true);
mockGetServerSession.mockResolvedValue({ user: { email: '...' } });
```

### unstable_cache

- キー名は分析タイプごとにユニークにする（例: `analysis-occupancy-logs`, `analysis-attendance-logs`）
- `revalidate: 3600`（1時間）は在室状況に適切。分析タイプによって調整する。
- 開発中にキャッシュが邪魔な場合、`unstable_cache` をバイパスして直接呼ぶヘルパーを用意してもよい。

### データソース

在室状況は `occupancy_logs` ワークシートを使用。月間ランキングは `入退室記録` ワークシート（`GoogleSheetOccupancyRepository`経由）を使用。新分析が別のワークシートを参照する場合、`CONFIG.SPREADSHEET` にシート名を追加する。

### ChartContainer と PNG エクスポート

- `html-to-image` の `toPng` を使用。`backgroundColor: '#ffffff'` を指定しないと透過背景になる。
- Recharts の `ResponsiveContainer` は PNG 出力時にサイズが崩れることがある。固定幅の fallback を検討してもよい。

### パラメータ UI

`AnalysisDateRange`（from/to）は在室状況分析で使用。月間ランキングは `MonthSelector`（月選択 + TopN選択）を使用。分析タイプ固有のパラメータが必要な場合は、分析タイプごとの設定コンポーネントを作り、`page.tsx` で `analysisType` に応じて切り替える。

### PDF エクスポート

月間ランキングでは `html-to-image`（既存）+ `jspdf` でA4 PDF を生成。フロー:
1. A4サイズ (794×1123px) の固定レイアウトコンポーネントを `toPng(ref, { pixelRatio: 3, backgroundColor: '#f8fafc' })` でキャプチャ
2. `jsPDF` で A4 PDF に埋め込み（動的インポートでSSR回避）
3. PDF用CSSではCSS変数ではなく直値を使用（`html-to-image` の互換性のため）

**PDFデザイン方針**（掲示板用のインパクト重視）:
- **ダークヘッダー**: `#0f172a` → `#1e293b` グラデーション + ドットグリッドオーバーレイ
- **表彰台レイアウト**: Top3は大型カード（2位-1位-3位配置）、4位以降はコンパクト行
- **鮮やかなメダルカラー**: ゴールド `#fbbf24`、シルバー `#94a3b8`、ブロンズ `#d97706`
- **プログレスバー**: 各生徒に1位の時間に対する相対バー
- **フォント**: Inter (数字・英字) + Noto Sans JP (日本語)、ウェイト差 900 vs 500
- **CSS Modules**: `composes:` で表彰台カード共通スタイルを継承（podiumCard → podiumCard1/2/3）

### CSS

- CSS Modules (`analysis.module.css`) はページレベルのレイアウト用。
- チャートコンポーネントはインラインスタイル + CSS variables で統一。
- ブランドカラー: `var(--brand-color)` = `#f29f30`
- チャートの色使い: 平日=`#6c5ce7`(紫)、休日=`#ff7675`(赤)、本館=`#f29f30`(橙)、2号館=`#00cec9`(シアン)
