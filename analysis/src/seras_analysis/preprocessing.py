import polars as pl
from datetime import date, timedelta
from typing import Optional

def filter_occupancy_data(
    df: pl.DataFrame,
    start_date: date,
    end_date: Optional[date] = None,
    exclude_today: bool = True,
) -> pl.DataFrame:
    """
    在室状況データを開始日・終了日に基づいてフィルタリングし、オプションで当日（最新日）を除外します。

    Args:
        df: 'Date'カラムを含むPolars DataFrame
        start_date: フィルタリングの開始日（この日を含む）
        end_date: フィルタリングの終了日（この日を含む）。Noneの場合は全日付を含む
        exclude_today: データセット内の最新日（当日と仮定）を除外するかどうか

    Returns:
        フィルタリングされたPolars DataFrame
    """
    if df.is_empty():
        return df

    # DateカラムをDate型にキャスト
    df = df.with_columns(pl.col("Date").cast(pl.Date))

    # 開始日でフィルタリング
    df_clean = df.filter(pl.col("Date") >= start_date)

    # 終了日でフィルタリング
    if end_date is not None:
        df_clean = df_clean.filter(pl.col("Date") <= end_date)
    
    # 当日/最新日の除外
    if exclude_today and not df_clean.is_empty():
        max_date = df_clean["Date"].max()
        if max_date is not None:
            # データセット内の最大日付を「今日」と仮定して除外する
            # （リアルタイムデータ収集の不完全性を考慮するため）
            print(f"除外対象の日付（最新日）: {max_date}")
            df_clean = df_clean.filter(pl.col("Date") < max_date)
            
    return df_clean

def extract_daily_opening_times(df: pl.DataFrame) -> pl.DataFrame:
    """
    各建物の有効な開館時間を抽出します。
    
    ロジック:
    1. タイムスタンプでソート
    2. イベントを走査して有効な OPEN -> CLOSE のペアを見つける
    3. 二重押下（OPEN-OPEN, CLOSE-CLOSE）を処理
    4. 期間（Duration）を計算
    5. 1時間未満のデータを誤操作として除外
    
    Returns:
        以下のカラムを持つDataFrame: [Date, Building, OpenTime, CloseTime, DurationHours, Opener, Closer]
    """
    if df.is_empty():
        return pl.DataFrame(schema={
            "Date": pl.Date, "Building": pl.Utf8, 
            "OpenTime": pl.Datetime, "CloseTime": pl.Datetime, 
            "DurationHours": pl.Float64,
            "Opener": pl.Utf8, "Closer": pl.Utf8
        })

    # ソート
    df = df.sort(["Building", "Timestamp"])
    
    results = []
    
    # 建物ごとに処理
    buildings = df["Building"].unique()
    
    for building in buildings:
        subset = df.filter(pl.col("Building") == building)
        subset = subset.sort("Timestamp")
        
        # 状態追跡
        current_open = None # (timestamp, actor, date)
        
        # 行をイテレート
        rows = subset.select(["Timestamp", "Date", "Action", "Actor Name"]).iter_rows(named=True)
        
        for row in rows:
            action = row["Action"].upper()
            ts = row["Timestamp"]
            actor = row["Actor Name"]
            Date = row["Date"]
            
            if action == "OPEN":
                if current_open is None:
                    # 新しいセッション開始
                    current_open = (ts, actor, Date)
                else:
                    # 既にOPEN状態でOPEN -> 無視（二重押下？）
                    pass
            elif action == "CLOSE":
                if current_open is not None:
                    # 有効なペア検出
                    open_ts, open_actor, open_date = current_open
                    close_ts = ts
                    close_actor = actor
                    
                    # 期間計算
                    duration_seconds = (close_ts - open_ts).total_seconds()
                    duration_hours = duration_seconds / 3600.0
                    
                    # 候補として追加
                    results.append({
                        "Date": open_date,
                        "Building": building,
                        "OpenTime": open_ts,
                        "CloseTime": close_ts,
                        "DurationHours": duration_hours,
                        "Opener": open_actor,
                        "Closer": close_actor
                    })
                    
                    # 状態リセット
                    current_open = None
                else:
                    # OPENなしでCLOSE -> 無視
                    pass
        
    if not results:
         return pl.DataFrame(schema={
            "Date": pl.Date, "Building": pl.Utf8, 
            "OpenTime": pl.Datetime, "CloseTime": pl.Datetime, 
            "DurationHours": pl.Float64,
            "Opener": pl.Utf8, "Closer": pl.Utf8
        })

    df_results = pl.DataFrame(results)
    
    # 1時間未満のデータを除外（誤操作とみなす）
    df_clean = df_results.filter(pl.col("DurationHours") >= 1.0)
    
    return df_clean
