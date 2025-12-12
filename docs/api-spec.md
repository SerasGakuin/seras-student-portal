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

### 4. Cron Jobs

#### GET /api/cron/auto-close
**System Internal**. 毎日23:00にVercel Cronによって実行される。
2号館が開館中(OPEN)の場合、自動的に閉館(CLOSE)に変更し、ログを記録する。

*   **Logic**:
    1.  `occupancyService.getOccupancyData` で現在の状態を確認。
    2.  `building2.isOpen === true` なら `occupancyService.updateBuildingStatus(isOpen=false)` を実行。
*   **Response**:
    *   `{ status: 'ok', data: { closed: true }, message: '...' }` (変更あり)
    *   `{ status: 'ok', data: { closed: false }, message: '...' }` (変更なし)
