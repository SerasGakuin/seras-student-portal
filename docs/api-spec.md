# API & データスキーマ (API & Schemas)

## バリデーション (Zod)
全ての API 入力は `src/lib/schema.ts` で定義されたスキーマを使用して検証されます。

### 生徒データ (Student)
- **lineId**: String (必須)
- **name**: String (必須)
- **grade**: Enum ('中1' - '高3', '既卒', '講師')
- **status**: Enum ('在塾', '体験', '退塾', '休塾', '在塾(講師)', '退塾(講師)', '教室長')

### 予約リクエスト (Booking Request)
`POST /api/reserveMeeting` で使用
- **userId**: String (LINE User ID)
- **meetingType**: String (例: "面談")
- **date**: YYYY-MM-DD
- **arrivalTime**: HH:MM (API が入力を正規化)
- **leaveTime**: HH:MM

### 欠席リクエスト (Rest Day Request)
`POST /api/registerRestDay` で使用
- **userId**: String
- **date**: YYYY-MM-DD

## API エンドポイント (`src/lib/api.ts`)

### 1. 認証 (Auth)

#### POST /api/auth/login
LINEユーザーが生徒として登録済みか確認

*   **Service Used**: `AuthService` -> `StudentService`

### 2. 混雑状況 (Occupancy)

#### GET /api/occupancy
現在の在室状況と開館ステータスを取得する。

*   **Response**: `ApiResponse<OccupancyData>`
    ```ts
    interface OccupancyData {
      building1: {
        count: number;
        isOpen: boolean;
        members: { name: string; grade: string }[]; // Teacher only (empty for students)
      };
      building2: {
        count: number;
        isOpen: boolean;
        members: { name: string; grade: string }[]; // Teacher only
      };
      timestamp: string;
    }
    ```

#### POST /api/occupancy/status
開館状況を変更する（教室長のみ）。

*   **Request**: `z.object({ building: z.enum(['1', '2']), isOpen: z.boolean(), actorName: z.string() })`
*   **Response**: `ApiResponse<{ success: true }>`

### 3. イベント予約 (Calendar)

#### POST /api/reserveMeeting
面談イベント作成 + LINE通知

*   **Service Used**: `CalendarService`, `LineService`

#### POST /api/registerRestDay
一日欠席イベント作成 + LINE通知

*   **Service Used**: `CalendarService`, `LineService`

### 4. ランキング (Ranking)

#### GET /api/ranking
週間ランキング（バッジ情報）を取得する。

*   **Query Parameters**:
    *   `date` (optional): 基準日 (YYYY-MM-DD)。省略時は現在日時。
*   **Service Used**: `BadgeService`
*   **Response**:
    ```ts
    interface RankingResponse {
      exam: Record<string, { type: BadgeType; rank: number }[]>;
      general: Record<string, { type: BadgeType; rank: number }[]>;
    }
    ```
*   **データ範囲**: 基準日の前日から遡って7日間のローリングウィンドウ

### 5. ダッシュボード (Dashboard)

#### GET /api/dashboard/stats
講師・教室長向けのダッシュボード統計を取得する。

*   **認証**: `canViewDashboard` 権限必須
*   **Query Parameters**:
    *   `from` (optional): 開始日 (YYYY-MM-DD)
    *   `to` (optional): 終了日 (YYYY-MM-DD)
    *   `grade` (optional): 学年フィルター (例: `高3`, `中学生`)
*   **Service Used**: `DashboardService`
*   **Response**:
    ```ts
    interface DashboardStats {
      totalStudyTime: number;          // 総学習時間（分）
      totalAttendance: number;         // 延べ通塾人数
      topLearner: { name: string; duration: number } | null;
      studentStats: StudentStat[];     // ランキングデータ
      dailyCumulative: DailyData[];    // 日次累積データ
    }
    ```

#### GET /api/dashboard/student-detail
個別生徒の詳細情報を取得する。

*   **認証**: 本人または講師・教室長
*   **Query Parameters**:
    *   `name` (required): 生徒名
    *   `days` (optional): 集計日数 (default: 28)
*   **Service Used**: `DashboardService`
*   **Response**:
    ```ts
    interface StudentDetails {
      totalDuration: number;
      attendanceDays: number;
      currentStreak: number;
      maxStreak: number;
      dailyData: { date: string; duration: number }[];
      hourlyDistribution: number[];    // 24時間帯別分布
    }
    ```

### 6. Cron Jobs

#### GET /api/cron/nightly
**System Internal**. 毎日23:00 (JST) にVercel Cronによって実行される夜間バッチ処理。
以下の処理を統合して実行する:

1. **自動閉館**: 2号館が開館中(OPEN)の場合、自動的に閉館(CLOSE)に変更
2. **退室時刻補完**: 退室記録のない入室ログに対して退室時刻を自動補完＋LINE通知

*   **Service Used**: `NightlyService` (内部で `ExitTimeFillService` を使用)
*   **Response**:
    ```ts
    interface NightlyResult {
      autoClose: {
        closed: boolean;
        message: string;
        error?: string;
      };
      fillExitTime: {
        filled: number;
        notified: number;
        errors: string[];
      };
      summary: string;
    }
    ```

#### GET /api/cron/remind-open
**System Internal**. 教室長への開館リマインダー。

*   **Logic**:
    1.  曜日チェック: `CONFIG.REMINDER.AUTO_OPEN.EXCLUDE_DAYS` に含まれる曜日はスキップ。
    2.  状態チェック: 2号館がすでに開館中(OPEN)の場合はスキップ。
    3.  教室長のLINE IDを取得し、リマインドメッセージを送信。
*   **Response**:
    *   `{ message: 'Skipped (Excluded Day)' }` (除外曜日)
    *   `{ message: 'Skipped (Building 2 Already Open)' }` (すでに開館)
    *   `{ message: 'Reminder sent to Principal', principal: name }` (送信成功)

#### GET /api/cron/auto-close (非推奨)
**Note**: `/api/cron/nightly` に統合されました。手動実行用に残されています。

#### GET /api/cron/fill-exit-time (非推奨)
**Note**: `/api/cron/nightly` に統合されました。手動実行用に残されています。

