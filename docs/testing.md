# テスト戦略とガイド (Testing Strategy & Guide)

Seras学院生徒用ポータルでは、ビジネスロジックの正確性とセキュリティ（権限管理）を担保するために、Jestを用いた自動テストを導入しています。

## 1. テストの実行

```bash
# 全テストの実行
npm test

# ウォッチモード（開発中に推奨）
npm test -- --watch

# 特定のファイルをテスト
npm test dashboardService
```

## 2. テスト範囲とカバレッジ

現在は **Service Layer (Unit Tests)** と **API Layer (Integration Tests)** に重点を置いています。

### A. Service Unit Tests (`src/services/*.test.ts`)
外部依存（Google API, Database）をモック化し、純粋なビジネスロジックを高速に検証します。

| サービス名 | テスト対象の主なロジック |
| :--- | :--- |
| **DashboardService** | ・滞在時間の計算（退室忘れ時の4時間/22時打ち切り補完）<br>・ストリーク（連続通塾）の判定<br>・前期間とのトレンド比較ロジック |
| **BadgeService** | ・週間ランキングの集計<br>・バッジ付与条件（HEAVY_USER, EARLY_BIRD, RISING_STAR等）<br>・受験生/非受験生のグループ分け |
| **OccupancyService** | ・在室人数のカウント<br>・スプレッドシートデータのOpen/Closeステータス変換<br>・ユーザー属性による詳細情報の秘匿（メンバー表示の制御） |

### B. API Integration Tests (`src/__tests__/integration/*.test.ts`)
APIエンドポイント (`/api/*`) に対するリクエストをシミュレーションし、**認証・認可**とレスポンス形式を検証します。

| API / 機能 | 検証内容 (Permission Audit) |
| :--- | :--- |
| **Dashboard API** | ・**Guest**: 401 Unauthorized<br>・**Student**: 403 Forbidden（生徒はダッシュボード閲覧不可）<br>・**Teacher/Principal**: 200 OK（全データ閲覧可） |
| **Student Detail API** | ・**Student**: 自分のデータのみ閲覧可 (200)、他人のデータは閲覧不可 (403)<br>・**Teacher**: 任意の生徒データを閲覧可 |
| **Occupancy API** | ・**GET**: 一般公開 (200)<br>・**POST (Status Update)**: **教室長 (Principal)** のみ実行可。講師や生徒は 403 Forbidden。 |
| **Ranking API** | ・認証済みユーザーのみアクセス可。レスポンス形式が `ApiResponse` (`{ status: 'ok', data: ... }`) であること。 |

## 3. テスト実装パターン

### モック戦略 (Mocking Strategy)
外部サービス（Google Sheets, LINE Platform）への依存は全て `jest.mock` で遮断します。

**例: リポジトリのモックと `isolateModules` パターン**
Serviceがモジュールレベルでリポジトリをインスタンス化している場合、テストごとにモックをリセットするために `jest.isolateModules` を使用します。

```typescript
// パターン例
describe('MyService', () => {
    let service: any;
    
    beforeEach(() => {
        // 1. モックの実装を定義
        (MyRepository as jest.Mock).mockImplementation(() => ({
            findAll: jest.fn().mockResolvedValue([])
        }));

        // 2. モジュールを再評価して新しいモックインスタンスを読み込ませる
        jest.isolateModules(() => {
            const { MyService } = require('./myService');
            service = new MyService();
        });
    });
});
```

### 認証のテスト (Auth Testing)
`next-auth` や `authUtils` をモックし、特定のユーザー権限（LINE User ID等）を持った状態をシミュレートしてAPIを呼び出します。

```typescript
// next-auth のセッションを無効化（LINE認証フローを強制）
jest.mock('next-auth/next', () => ({
    getServerSession: jest.fn().mockResolvedValue(null)
}));
```

## 4. 新しい機能を追加する場合
1.  **Service**: 複雑な計算ロジックがある場合は、必ず `src/services/` に対応する `.test.ts` を作成してください。
2.  **API**: 新しいエンドポイントを作成した場合、または権限ルールを変更した場合は、必ず `src/__tests__/integration/` に統合テストを追加し、不正アクセスが弾かれることを確認してください。
