from typing import Optional, Union, List, Tuple
from datetime import date, datetime
import math
import polars as pl
import matplotlib.pyplot as plt
from matplotlib.ticker import MaxNLocator, FuncFormatter
import seaborn as sns
import numpy as np
from matplotlib.lines import Line2D
from matplotlib.colors import LinearSegmentedColormap
import japanize_matplotlib
japanize_matplotlib.japanize()
import warnings
warnings.filterwarnings("ignore")

# ==========================================
# Seras Design System Colors (ブランドカラー定義)
# ==========================================
COLORS = {
    "brand": "#f29f30",      # Orange
    "text_main": "#2d3436",  # Dark Gray
    "text_sub": "#a4b0be",   # Light Gray
    "bg": "#f2f4f8",         # Light Blue/Gray
    "status_low": "#00cec9", # Cyan/Teal
    "status_mid": "#f29f30", # Orange
    "status_high": "#ff7675",# Red/Pink
    # 補色
    "blue": "#6c5ce7",       # Purple/Blue
    "green": "#00b894",      # Green
    "yellow": "#fdcb6e",     # Yellow
}

# テーマ設定: モダンでフラットなデザイン ("paper" context, white style)
sns.set_theme(style="white", context="paper", font_scale=1.1)
plt.rcParams.update({
    "font.family": ["Hiragino Sans", "sans-serif"],
    "text.color": COLORS["text_main"],
    "axes.labelcolor": COLORS["text_main"],
    "xtick.color": COLORS["text_sub"],
    "ytick.color": COLORS["text_sub"],
    "axes.spines.top": False,
    "axes.spines.right": False,
    "axes.linewidth": 0.0, # 軸の境界線を消してクリーンに
    "grid.color": "#dfe6e9",
    "grid.linestyle": ":",
    "grid.linewidth": 0.8,
    "figure.facecolor": "#ffffff", # 背景は完全な白
    "axes.facecolor": "#ffffff",
    "figure.constrained_layout.use": True,
})

def _prepare_data(df: pl.DataFrame, start_date: Optional[Union[str, date]] = None) -> Tuple[pl.DataFrame, pl.Series]:
    """日時フィルタリングとソートを行うヘルパー関数"""
    if start_date:
        if isinstance(start_date, str):
            start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
        df = df.filter(pl.col("Date") >= start_date)

    df_sorted = df.sort("Timestamp")
    unique_dates = df_sorted["Date"].unique().sort()
    return df_sorted, unique_dates

def _setup_axis(ax: plt.Axes, title: str, xlabel: str = "Hour", ylabel: str = "Occupancy") -> None:
    """軸のフォーマット（整数メモリ、グリッドなど）を設定するヘルパー関数"""
    ax.set_title(title, fontsize=12, fontweight="bold", color=COLORS["text_main"], pad=12)
    ax.set_xlabel(xlabel, fontsize=10, color=COLORS["text_sub"], weight="bold")
    
    if ylabel:
        ax.set_ylabel(ylabel, fontsize=10, color=COLORS["text_sub"], weight="bold")
    else:
        ax.set_ylabel("")
        
    ax.yaxis.set_major_locator(MaxNLocator(integer=True))
    ax.grid(True, axis='y', linestyle=":", alpha=0.6)
    ax.tick_params(axis='both', colors=COLORS["text_sub"], labelsize=9)

def plot_daily_trends(df: pl.DataFrame, start_date: Optional[Union[str, date]] = None) -> None:
    """日ごとの在室人数トレンド（合計）を重ね合わせてプロットします。"""
    df_sorted, unique_dates = _prepare_data(df, start_date)
    
    if len(unique_dates) == 0:
        print("プロットするデータがありません。")
        return

    plt.figure(figsize=(10, 6), dpi=120)
    ax = plt.gca()
    
    c_weekday = COLORS["blue"] 
    c_weekend = COLORS["status_high"]
    
    weekday_totals = {} 
    weekend_totals = {}
    
    for d in unique_dates:
        day_df = df_sorted.filter(pl.col("Date") == d)
        
        hours = day_df["Timestamp"].dt.hour()
        minutes = day_df["Timestamp"].dt.minute()
        decimal_time = hours + minutes / 60.0
        # 15分刻みに丸める（集計用）
        normalized_time = np.round(decimal_time * 4) / 4 
        values = day_df["Total"]
        
        is_weekend = d.weekday() >= 5
        color = c_weekend if is_weekend else c_weekday
        
        # 個別の日を非常に薄くプロット
        sns.lineplot(x=decimal_time, y=values, linewidth=0.8, color=color, alpha=0.1, ax=ax, legend=False)
        
        target_dict = weekend_totals if is_weekend else weekday_totals
        for t, v in zip(normalized_time, values):
            t_key = float(t)
            if t_key not in target_dict: target_dict[t_key] = []
            target_dict[t_key].append(v)

    # 平均線をプロット
    for label, data_dict, color in [("Weekday Mean", weekday_totals, c_weekday), ("Weekend Mean", weekend_totals, c_weekend)]:
        if not data_dict: continue
        sorted_times = sorted(data_dict.keys())
        means = [np.mean(data_dict[t]) for t in sorted_times]
        
        # 光彩効果（太い薄い線）
        ax.plot(sorted_times, means, color=color, linewidth=4, alpha=0.2) 
        # メインライン
        ax.plot(sorted_times, means, color=color, linewidth=2, alpha=1.0, label=label)

    _setup_axis(ax, title="日次在室トレンド (重ね合わせ)", ylabel="合計人数")
    
    ax.set_xlim(6, 23)
    ax.set_xticks(range(6, 24, 3))
    
    legend_elements = [
        Line2D([0], [0], color=c_weekday, lw=2, label='平日 (平均)'),
        Line2D([0], [0], color=c_weekend, lw=2, label='土日 (平均)'),
        Line2D([0], [0], color=c_weekday, lw=0.8, alpha=0.4, label='個別の日')
    ]
    ax.legend(handles=legend_elements, loc='upper left', frameon=False, fontsize=9, labelcolor=COLORS["text_main"])
    sns.despine(left=True)
    plt.show()

def plot_daily_breakdown(df: pl.DataFrame, start_date: Optional[Union[str, date]] = None) -> None:
    """日ごとの詳細（積み上げ面グラフ）をスモールマルチプルでプロットします。"""
    df_sorted, unique_dates = _prepare_data(df, start_date)
    
    if len(unique_dates) == 0:
        print("プロットするデータがありません。")
        return

    n_cols = 3
    n_rows = math.ceil(len(unique_dates) / n_cols)
    if n_rows == 0: n_rows = 1
    
    c_b1 = COLORS["status_low"] # Building 1
    c_b2 = COLORS["brand"]      # Building 2
    
    fig, axes = plt.subplots(n_rows, n_cols, figsize=(n_cols * 4, n_rows * 3), sharey=True, dpi=110)
    if n_rows * n_cols > 1:
        axes = axes.flatten()
    else:
        axes = [axes]

    for i, d in enumerate(unique_dates):
        ax = axes[i]
        day_df = df_sorted.filter(pl.col("Date") == d)
        
        hours = day_df["Timestamp"].dt.hour()
        minutes = day_df["Timestamp"].dt.minute()
        decimal_time = hours + minutes / 60.0
        
        b1 = day_df["Building1"].to_numpy()
        b2 = day_df["Building2"].to_numpy()
        
        ax.stackplot(decimal_time, b1, b2, labels=["1号館", "2号館"], 
                     colors=[c_b1, c_b2], alpha=0.85, linewidth=0)
        
        # 合計線（薄く）
        total = b1 + b2
        ax.plot(decimal_time, total, color=COLORS["text_sub"], linewidth=0.8, alpha=0.5)

        day_name = day_df["Day"][0] if "Day" in day_df.columns else ""
        ylabel = "在室人数" if i % n_cols == 0 else ""
        _setup_axis(ax, title=f"{d} ({day_name})", ylabel=ylabel)
        
        ax.set_xlim(6, 23)
        ax.set_xticks(range(6, 24, 6))

        if i == 0:
            ax.legend(loc='upper right', fontsize=8, frameon=False, labelcolor=COLORS["text_main"])

    for j in range(i + 1, len(axes)):
        axes[j].axis('off')

    sns.despine(left=True)
    plt.tight_layout()
    plt.show()

def plot_average_occupancy_heatmap(df: pl.DataFrame, start_date: Optional[Union[str, date]] = None) -> None:
    """
    曜日×時間の平均在室ヒートマップをプロットします。
    「いつ混んでいるか？」を直感的に可視化します。
    """
    df_sorted, _ = _prepare_data(df, start_date)
    
    # Hour/Weekdayカラムがない場合の補完
    if "Hour" not in df_sorted.columns:
        df_sorted = df_sorted.with_columns(pl.col("Timestamp").dt.hour().alias("Hour"))
    if "Weekday" not in df_sorted.columns:
        df_sorted = df_sorted.with_columns(pl.col("Timestamp").dt.weekday().alias("Weekday")) # 1=Mon

    # 集計: 曜日・時間ごとの平均人数
    # 時間帯フィルタ (例: 7時〜22時)
    df_agg = (
        df_sorted
        .filter((pl.col("Hour") >= 7) & (pl.col("Hour") <= 22))
        .group_by(["Weekday", "Hour"])
        .agg(pl.col("Total").mean().alias("AvgOccupancy"))
        .sort(["Weekday", "Hour"])
    )
    
    weekday_map = {1: "月", 2: "火", 3: "水", 4: "木", 5: "金", 6: "土", 7: "日"}
    hours = list(range(7, 23))
    matrix = np.zeros((7, len(hours)))
    
    for row in df_agg.iter_rows(named=True):
        w_idx = row["Weekday"] - 1 # 0-6
        h_idx = row["Hour"] - 7    # 0-15
        if 0 <= w_idx < 7 and 0 <= h_idx < len(hours):
            matrix[w_idx, h_idx] = row["AvgOccupancy"]

    plt.figure(figsize=(10, 5), dpi=120)
    ax = plt.gca()
    
    # ホワイト -> ブランドカラー -> 濃色 のグラデーション
    colors = ["#ffffff", COLORS["brand"], "#d35400"] 
    cmap = LinearSegmentedColormap.from_list("seras_heat", colors, N=100)
    
    sns.heatmap(matrix, annot=True, fmt=".1f", cmap=cmap, cbar=True,
                xticklabels=hours, yticklabels=list(weekday_map.values()),
                linewidths=1, linecolor='white', square=True, ax=ax,
                cbar_kws={'label': '平均人数'})
    
    ax.set_title("曜日・時間帯別 平均混雑度", fontsize=13, fontweight="bold", pad=15, color=COLORS["text_main"])
    ax.set_xlabel("時間", fontsize=10, color=COLORS["text_sub"], weight="bold")
    ax.set_ylabel("曜日", fontsize=10, color=COLORS["text_sub"], weight="bold")
    
    plt.show()

def plot_opening_time_stats(df_pairs: pl.DataFrame) -> None:
    """
    曜日ごとの開館時間の分布をプロットします。
    """
    if df_pairs.is_empty():
        print("分析対象の開閉ログがありません。")
        return

    data_list = []
    weekday_map = {1: "月", 2: "火", 3: "水", 4: "木", 5: "金", 6: "土", 7: "日"}
    
    for row in df_pairs.iter_rows(named=True):
        dt = row["OpenTime"] 
        weekday = dt.isoweekday() 
        decimal_hour = dt.hour + dt.minute / 60.0
        
        data_list.append({
            "WeekdayNum": weekday,
            "Weekday": weekday_map.get(weekday, str(weekday)),
            "OpenHour": decimal_hour
        })
        
    plot_df = pl.DataFrame(data_list)
    plot_df = plot_df.sort("WeekdayNum")
    
    plt.figure(figsize=(8, 5), dpi=120)
    ax = plt.gca()
    
    # 1. Strip plot (散布図)
    sns.stripplot(
        data=plot_df.to_pandas(), 
        x="Weekday", y="OpenHour", 
        hue="Weekday", palette="husl", legend=False,
        size=8, jitter=0.15, alpha=0.7, ax=ax, zorder=3,
        edgecolor='white', linewidth=1
    )
    
    # 2. Box plot (箱ひげ図)
    sns.boxplot(
        data=plot_df.to_pandas(),
        x="Weekday", y="OpenHour",
        boxprops=dict(facecolor='#f7f7f7', edgecolor=COLORS["text_sub"], alpha=0.5),
        whiskerprops=dict(color=COLORS["text_sub"]),
        capprops=dict(color=COLORS["text_sub"]),
        medianprops=dict(color=COLORS["brand"], linewidth=2),
        width=0.5, showfliers=False, ax=ax, zorder=1
    )

    # Y軸を HH:MM 表記に
    def time_format(x, pos):
        h = int(x)
        m = int((x - h) * 60)
        return f"{h:02d}:{m:02d}"
    
    ax.yaxis.set_major_formatter(FuncFormatter(time_format))
    ax.yaxis.set_major_locator(MaxNLocator(integer=True))
    
    ax.set_title("2号館 開館時間分布", fontsize=12, fontweight="bold", color=COLORS["text_main"], pad=15)
    ax.set_ylabel("開館時刻", fontsize=10, weight="bold")
    ax.set_xlabel("")
    
    ax.grid(True, axis='y', linestyle=":", alpha=0.6)
    sns.despine(left=True)
    
    plt.figtext(0.5, 0.01, "点は個々の日付を表します。箱は典型的な範囲を示します。", 
                ha="center", fontsize=8, color=COLORS["text_sub"])
    
    plt.show()
