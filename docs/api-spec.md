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

| Http Method | Endpoint | Description | Service Used |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | LINEユーザーが生徒として登録済みか確認 | `AuthService` -> `StudentService` |
| `POST` | `/api/reserveMeeting` | 面談イベント作成 + LINE通知 | `CalendarService`, `LineService` |
| `POST` | `/api/registerRestDay` | 一日欠席イベント作成 + LINE通知 | `CalendarService`, `LineService` |
| `GET` | `/api/occupancy` | 現在の自習室在室人数を取得 | 直アクセス (将来的にService化予定) |
