from typing import Optional, Tuple
import gspread
import polars as pl
from . import auth, config

def _fetch_sheet_as_df(
    client: gspread.Client, 
    spreadsheet_id: str, 
    worksheet_name: str,
    datetime_cols: Optional[list[str]] = None,
    date_cols: Optional[list[str]] = None
) -> pl.DataFrame:
    """
    指定されたワークシートを取得し、Polars DataFrameに変換して型キャストを行います。
    
    Args:
        client: gspreadクライアント
        spreadsheet_id: スプレッドシートID
        worksheet_name: ワークシート名
        datetime_cols: 日時型（Datetime）に変換するカラム名のリスト
        date_cols: 日付型（Date）に変換するカラム名のリスト
        
    Returns:
        pl.DataFrame: 読み込まれたデータフレーム
    """
    try:
        sh = client.open_by_key(spreadsheet_id)
        worksheet = sh.worksheet(worksheet_name)
        records = worksheet.get_all_records()
        
        df = pl.DataFrame(records)
        
        if df.is_empty():
            return df
            
        conversions = []
        if datetime_cols:
            conversions.extend([
                pl.col(col).str.strptime(pl.Datetime, format="%Y/%m/%d %H:%M:%S", strict=False)
                for col in datetime_cols if col in df.columns
            ])
        
        # 修正: 定義した変換を適用する
        if conversions:
            df = df.with_columns(conversions)
            
        if date_cols:
            for col in date_cols:
                if col in df.columns:
                    # 複数のフォーマットを試行
                    df = df.with_columns(
                        pl.coalesce([
                            pl.col(col).str.strptime(pl.Date, format="%Y/%m/%d", strict=False),
                            pl.col(col).str.strptime(pl.Date, format="%Y-%m-%d", strict=False),
                            # ISO8601へのフォールバック
                            pl.col(col).cast(pl.Date, strict=False)
                        ]).alias(col)
                    )
            
        return df

    except gspread.exceptions.WorksheetNotFound:
        print(f"警告: ワークシート '{worksheet_name}' が見つかりませんでした。")
        return pl.DataFrame()
    except Exception as e:
        print(f"'{worksheet_name}' の読み込みエラー: {e}")
        return pl.DataFrame()


def load_data() -> Tuple[pl.DataFrame, pl.DataFrame]:
    """
    分析用データをロードするメインエントリーポイント。
    
    Returns:
        Tuple[pl.DataFrame, pl.DataFrame]: (df_occupancy, df_open)
        - df_occupancy: 在室状況ログ
        - df_open: 開館記録ログ（Dateカラム追加済み）
    """
    client = auth.get_google_client()
    spreadsheet_id = config.SPREADSHEET_ID

    df_occupancy = _fetch_sheet_as_df(
        client, 
        spreadsheet_id, 
        'occupancy_logs',
        datetime_cols=['Timestamp'],
        date_cols=['Date']
    )

    df_open = _fetch_sheet_as_df(
        client, 
        spreadsheet_id, 
        'open_logs',
        datetime_cols=['Timestamp']
    )

    if not df_open.is_empty() and "Timestamp" in df_open.columns:
        # TimestampからDateを抽出
        df_open = df_open.with_columns(
            pl.col("Timestamp").dt.date().alias("Date")
        )

    return df_occupancy, df_open
