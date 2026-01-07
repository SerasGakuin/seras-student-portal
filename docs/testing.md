# テスト戦略とガイド (Testing Strategy & Guide)

Seras学院生徒ポータルでは、ビジネスロジックの正確性とセキュリティ（権限管理）を担保するために、**Jest** を用いた自動テストを導入しています。

## 1. テストの実行

```bash
# 全テストの実行
npm test

# ウォッチモード（開発中に推奨）
npm test -- --watch

# 特定のファイルをテスト
npm test dashboardService

# カバレッジレポートの生成
npm test -- --coverage
```

## 2. テスト構成

現在のテストは **Service Layer (Unit Tests)** と **API Layer (Integration Tests)** に重点を置いています。

```
src/
├── services/
│   ├── badgeService.test.ts         # バッジ付与ロジック
│   ├── dashboardService.test.ts     # 統計・集計ロジック
│   ├── occupancyService.test.ts     # 在室状況ロジック
│   ├── studentService.test.ts       # 生徒データ処理
│   └── calendarService.test.ts      # カレンダー連携
├── repositories/
│   └── googleSheets/__tests__/
│       └── GoogleSheetStudentRepository.test.ts  # データアクセス層
└── __tests__/
    └── integration/
        ├── dashboard-api.test.ts    # ダッシュボードAPI権限
        ├── occupancy-api.test.ts    # 在室状況API権限
        └── ranking-api.test.ts      # ランキングAPI
```

## 3. テスト対象と検証内容

### A. Service Unit Tests (`src/services/*.test.ts`)

外部依存（Google API, LINE Platform）をモック化し、純粋なビジネスロジックを高速に検証します。

| サービス | テスト対象 |
| :--- | :--- |
| **BadgeService** | ・週間ランキングの集計<br>・バッジ付与条件（HEAVY_USER, EARLY_BIRD, NIGHT_OWL, CONSISTENT, MARATHON, RISING_STAR）<br>・受験生/非受験生のグループ分け<br>・時間帯別の滞在時間計算（オーバーラップのマージ含む） |
| **DashboardService** | ・滞在時間の計算（退室忘れ時の4時間/22時打ち切り補完）<br>・ストリーク（連続通塾）の判定<br>・前期間とのトレンド比較ロジック |
| **OccupancyService** | ・在室人数のカウント<br>・Open/Closeステータス変換<br>・ユーザー属性による詳細情報の秘匿（メンバー表示の制御） |
| **StudentService** | ・生徒データのパース<br>・名前・学年の正規化<br>・欠損データの処理 |
| **CalendarService** | ・イベントデータのフォーマット<br>・タイムゾーン処理（JST） |

### B. Repository Tests (`src/repositories/**/*.test.ts`)

データアクセス層の変換ロジックを検証します。

| リポジトリ | テスト対象 |
| :--- | :--- |
| **GoogleSheetStudentRepository** | ・スプレッドシートデータから生徒オブジェクトへの変換<br>・動的カラムマッピングの検証 |

### C. API Integration Tests (`src/__tests__/integration/*.test.ts`)

APIエンドポイント (`/api/*`) に対するリクエストをシミュレーションし、**認証・認可**とレスポンス形式を検証します。

| API | 検証内容 |
| :--- | :--- |
| **Dashboard API** | ・Guest: 401 Unauthorized<br>・Student: 403 Forbidden（ダッシュボード閲覧不可）<br>・Teacher/Principal: 200 OK |
| **Student Detail API** | ・Student: 自分のデータのみ閲覧可 (200)、他人は 403<br>・Teacher: 任意の生徒データ閲覧可 |
| **Occupancy API** | ・GET: 一般公開 (200)<br>・POST (Status Update): 教室長のみ (他は 403) |
| **Ranking API** | ・認証済みユーザーのみアクセス可<br>・レスポンス形式が `{ status: 'ok', data: ... }` |

## 4. テスト実装パターン

### A. モック戦略 (Mocking Strategy)

外部サービス（Google Sheets, LINE Platform）への依存は全て `jest.mock` で遮断します。

### B. `isolateModules` パターン

サービスがモジュールレベルでリポジトリをインスタンス化している場合、テストごとにモックをリセットするために `jest.isolateModules` を使用します。

```typescript
describe('MyService', () => {
    let service: any;
    let mockFindAll: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        // 1. モックの実装を定義
        mockFindAll = jest.fn().mockResolvedValue([]);
        (MyRepository as jest.Mock).mockImplementation(() => ({
            findAll: mockFindAll
        }));

        // 2. モジュールを再評価して新しいモックインスタンスを読み込ませる
        jest.isolateModules(() => {
            const { MyService } = require('./myService');
            service = new MyService();
        });
    });

    it('should do something', async () => {
        mockFindAll.mockResolvedValue([{ id: 1 }]);
        const result = await service.doSomething();
        expect(result).toBeDefined();
    });
});
```

### C. Fake Timers パターン

日付依存のロジックをテストする場合、`jest.useFakeTimers()` を使用してシステム時刻を固定します。

```typescript
// テスト用定数の定義（DRY原則）
const TEST_DATE = {
    BASE: '2025-12-25',
    SYSTEM_TIME: '2025-12-25T14:00:00',
    NEXT_DAY: '2025-12-26T10:00:00',
};

describe('DateDependentService', () => {
    afterEach(() => {
        jest.useRealTimers();  // 必ずリセット
    });

    it('should calculate based on current date', async () => {
        jest.useFakeTimers().setSystemTime(new Date(TEST_DATE.SYSTEM_TIME));

        // テストロジック
    });
});
```

### D. 認証のテスト (Auth Testing)

`next-auth` と `studentService` をモックし、特定のユーザー権限をシミュレートします。

```typescript
// next-auth のセッションを無効化（LINE認証フローを強制）
jest.mock('next-auth/next', () => ({
    getServerSession: jest.fn().mockResolvedValue(null)
}));

// 生徒マスター検索をモック
jest.mock('@/services/studentService', () => ({
    getStudentFromLineId: jest.fn()
}));

// ロール別のテスト
describe('Permission Tests', () => {
    it('should allow Principal', async () => {
        mockGetStudentFromLineId.mockResolvedValue({
            lineId: 'p1', name: 'Boss', grade: '教室長', status: '教室長'
        });
        // ...
    });

    it('should deny Teacher', async () => {
        mockGetStudentFromLineId.mockResolvedValue({
            lineId: 't1', name: 'Teacher', grade: '講師', status: '在塾(講師)'
        });
        // ...
    });
});
```

## 5. 新機能追加時のガイドライン

### Service を追加する場合

1. **ユニットテストの作成**: 複雑な計算ロジックがある場合は、必ず `src/services/` に対応する `.test.ts` を作成
2. **モックの準備**: 外部依存（Repository等）は `jest.mock` で遮断
3. **エッジケースの網羅**: 境界値、エラーケース、空データのハンドリングをテスト

### API を追加する場合

1. **統合テストの作成**: `src/__tests__/integration/` に権限テストを追加
2. **全ロールでの検証**: Guest / Student / Teacher / Principal の各ロールでアクセス可否を確認
3. **レスポンス形式の検証**: `{ status: 'ok', data: ... }` 形式であることを確認

### 権限ルールを変更する場合

1. **`docs/permissions.md`** のAPIアクセスマトリクスを更新
2. 対応する統合テストで不正アクセスが弾かれることを確認
3. 許可されるべきロールでは正常にアクセスできることを確認

## 6. テスト品質の維持

- **テストは実装と同期**: 機能変更時は必ず対応するテストも更新
- **テスト名は具体的に**: 何をテストしているか一目で分かるように命名
- **一つのテストで一つの事を検証**: 複数の関心事を混ぜない
- **モックは最小限に**: 過度なモックは実装との乖離を招く

```bash
# 変更後は必ずテストを実行
npm test
```
