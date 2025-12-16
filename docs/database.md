# データベース (Spreadsheet) 定義

本アプリケーションは Google Sheets を簡易データベースとして使用しています。

## 生徒マスター (Student Master Sheet)
**Config Key**: `STUDENT_SPREADSHEET_ID`

| カラム名 (Header) | 必須 | 説明 |
| :--- | :--- | :--- |
| **名前** | Yes | 生徒のフルネーム |
| **生徒LINEID** | Yes | LINE User ID (Uxxxxxxxx...) |
| **学年** | Yes | 学年文字列 (例: "高1") |
| **Status** | Yes | 在籍ステータス (例: "在塾") |

*注: システムはヘッダー名で列を識別するため、これらのヘッダーが存在すれば列の順序は自由に変更可能です。*

## 在室人数 (Occupancy Log Sheet)
**Config Key**: `OCCUPANCY_SPREADSHEET_ID`
**Sheet Name**: `在室人数`

| セル/列 | 説明 | 備考 |
| :--- | :--- | :--- |
| **A2** | 本館人数 (Count) | 数値 |
| **B2** | 2号館人数 (Count) | 数値 |
| **C2** | 本館 開館状況 (IsOpen) | 1=Open, 0=Closed |
| **D2** | 2号館 開館状況 (IsOpen) | 1=Open, 0=Closed |
| **A3:A** | 本館在室者 (Names) | **DEPRECATED** (Legacy Logic) |
| **B3:B** | 2号館在室者 (Names) | **DEPRECATED** (Legacy Logic) |

## 入退室記録 (Entry/Exit Logs)
**Config Key**: `OCCUPANCY_SPREADSHEET_ID`
**Sheet Name**: `入退室記録`

| カラム | 説明 | 備考 |
| :--- | :--- | :--- |
| **A** | 入室時刻 (Entry Time) | `Thu Dec 14 2025 ...` |
| **B** | 退室時刻 (Exit Time) | 空欄 = 在室中 |
| **C** | 場所 (Building) | 1=本館, 2=2号館 |
| **D** | 名前 (Name) | 生徒氏名 |

**Sheet Name**: `occupancy_logs` (履歴データ)

| カラム | 説明 |
| :--- | :--- |
| **Timestamp** | 日時 (YYYY/MM/DD HH:mm:ss) |
| **Date** | 日付 (YYYY-MM-DD) |
| **Day** | 曜日 (Mon, Tue...) |
| **Hour** | 時間 (0-23) |
| **Building1** | 本館人数 |
| **Building2** | 2号館人数 |
| **Total** | 合計人数 |

**Sheet Name**: `open_logs`

| カラム | 説明 |
| :--- | :--- |
| **A** | Timestamp (ISO) |
| **B** | Actor Name (操作者) |
| **C** | Action (OPEN/CLOSE) |
| **D** | Building (本館/2号館) |
| **E** | UserAgent / Context |

