# データベース (Spreadsheet) 定義

本アプリケーションは Google Sheets を簡易データベースとして使用しています。

## 生徒マスタ (Student Master Sheet)
**Config Key**: `STUDENT_SPREADSHEET_ID`

| カラム名 (Header) | 必須 | 説明 |
| :--- | :--- | :--- |
| **名前** | Yes | 生徒のフルネーム |
| **生徒LINEID** | Yes | LINE User ID (Uxxxxxxxx...) |
| **学年** | Yes | 学年文字列 (例: "高1") |
| **Status** | Yes | 在籍ステータス (例: "在塾") |

*注: システムはヘッダー名で列を識別するため、これらのヘッダーが存在すれば列の順序は自由に変更可能です。*

## 入退室ログ (Occupancy Log Sheet)
**Config Key**: `OCCUPANCY_SPREADSHEET_ID`

入退室記録用シート。
(講師モード開発時にスキーマ詳細を追記予定)
