from typing import Optional, Union, List, Tuple
from datetime import date, datetime
import math
import polars as pl
import matplotlib.pyplot as plt
from matplotlib.ticker import MaxNLocator
import seaborn as sns
import numpy as np
from matplotlib.lines import Line2D

# Set refined, paper-like theme with modern aesthetics
sns.set_theme(style="white", context="paper", font_scale=1.1)
plt.rcParams.update({
    "font.family": "sans-serif",
    "axes.spines.top": False,
    "axes.spines.right": False,
    "axes.linewidth": 0.8,
    "grid.color": "#E0E0E0",
    "grid.linestyle": ":",
    "grid.linewidth": 0.8,
    "figure.constrained_layout.use": True,
})

def _prepare_data(df: pl.DataFrame, start_date: Optional[Union[str, date]] = None) -> Tuple[pl.DataFrame, pl.Series]:
    """
    Helper to filter, sort data and extract unique dates.
    """
    # Filter by start_date
    if start_date:
        if isinstance(start_date, str):
            start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
        df = df.filter(pl.col("Date") >= start_date)

    # Ensure data is sorted
    df_sorted = df.sort("Timestamp")
    
    # Get unique dates
    unique_dates = df_sorted["Date"].unique().sort()
    
    return df_sorted, unique_dates

def _setup_axis(ax: plt.Axes, title: str, xlabel: str = "Hour", ylabel: str = "Occupancy") -> None:
    """
    Helper to setup axis formatting (integer, grid, limits).
    """
    ax.set_title(title, fontsize=11, fontweight="600", color="#333333", pad=10)
    ax.set_xlabel(xlabel, fontsize=10, color="#555555")
    
    if ylabel:
        ax.set_ylabel(ylabel, fontsize=10, color="#555555")
    else:
        ax.set_ylabel("")
        
    # Integer Y-axis
    ax.yaxis.set_major_locator(MaxNLocator(integer=True))
    
    # X-axis limits (Standard operating hours)
    ax.set_xlim(6, 23)
    ax.set_xticks(range(6, 24, 3))
    
    ax.grid(True, axis='y', linestyle=":", alpha=0.6)
    ax.grid(False, axis='x')
    
    ax.tick_params(axis='both', colors="#555555", labelsize=9)

def plot_daily_trends(df: pl.DataFrame, start_date: Optional[Union[str, date]] = None) -> None:
    """
    Plots daily occupancy trends (Total only) overlaying all days on one plot.
    Colors are separated by Weekday vs Weekend, with high transparency.
    Adds MEAN trend lines for emphasis.
    """
    df_sorted, unique_dates = _prepare_data(df, start_date)
    
    if len(unique_dates) == 0:
        print("No data to plot.")
        return

    plt.figure(figsize=(10, 6), dpi=120)
    ax = plt.gca()
    
    # Refined Palette
    c_weekday = "#5D9CEC" # Soft Blue
    c_weekend = "#E06868" # Soft Red
    
    # Containers for mean calculation
    weekday_totals = {} # decimal_time_str -> list of values
    weekend_totals = {}
    
    for d in unique_dates:
        day_df = df_sorted.filter(pl.col("Date") == d)
        
        hours = day_df["Timestamp"].dt.hour()
        minutes = day_df["Timestamp"].dt.minute()
        decimal_time = hours + minutes / 60.0
        # Round for aggregating
        rounded_time = np.round(decimal_time * 4) / 4 
        
        values = day_df["Total"]
        
        is_weekend = d.weekday() >= 5
        color = c_weekend if is_weekend else c_weekday
        
        # Plot individual lines thinly
        sns.lineplot(x=decimal_time, y=values, linewidth=0.8, color=color, alpha=0.15, ax=ax, legend=False)
        
        # Aggregate for mean lines
        target_dict = weekend_totals if is_weekend else weekday_totals
        for t, v in zip(rounded_time, values):
            t_key = float(t)
            if t_key not in target_dict: target_dict[t_key] = []
            target_dict[t_key].append(v)

    # Plot Mean Lines
    for label, data_dict, color in [("Weekday Mean", weekday_totals, c_weekday), ("Weekend Mean", weekend_totals, c_weekend)]:
        if not data_dict: continue
        sorted_times = sorted(data_dict.keys())
        means = [np.mean(data_dict[t]) for t in sorted_times]
        
        # Smooth line
        ax.plot(sorted_times, means, color=color, linewidth=2.5, alpha=0.9, label=label)

    _setup_axis(ax, title="Daily Occupancy Trends (Overlay)", ylabel="Total Occupancy")
    
    # Custom Legend with better aesthetics
    legend_elements = [
        Line2D([0], [0], color=c_weekday, lw=2.5, label='Weekday (Avg)'),
        Line2D([0], [0], color=c_weekend, lw=2.5, label='Weekend (Avg)'),
        Line2D([0], [0], color=c_weekday, lw=0.8, alpha=0.4, label='Individual Days')
    ]
    ax.legend(handles=legend_elements, loc='upper left', frameon=False, fontsize=9)
    
    sns.despine()
    # plt.tight_layout() # handled by constrained_layout
    plt.show()

def plot_daily_breakdown(df: pl.DataFrame, start_date: Optional[Union[str, date]] = None) -> None:
    """
    Plots daily occupancy breakdown (Stacked Area) using Small Multiples.
    """
    df_sorted, unique_dates = _prepare_data(df, start_date)
    
    if len(unique_dates) == 0:
        print("No data to plot.")
        return

    n_cols = 3
    n_rows = math.ceil(len(unique_dates) / n_cols)
    if n_rows == 0: n_rows = 1
    
    # Modern Palette for Breakdown
    c_b1 = "#48CFAD" # Mint
    c_b2 = "#5D9CEC" # Blue
    
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
        
        # Stackplot
        ax.stackplot(decimal_time, b1, b2, labels=["Building 1", "Building 2"], 
                     colors=[c_b1, c_b2], alpha=0.8, linewidth=0)
        
        # Add a thin line on top of total for crispness
        total = b1 + b2
        ax.plot(decimal_time, total, color="#AAAAAA", linewidth=0.5, alpha=0.5)

        day_name = day_df["Day"][0] if "Day" in day_df.columns else ""
        
        ylabel = "Occupancy" if i % n_cols == 0 else ""
        _setup_axis(ax, title=f"{d} ({day_name})", ylabel=ylabel)
        
        # Legend only on first
        if i == 0:
            ax.legend(loc='upper right', fontsize=8, frameon=False)

    # Hide empty subplots
    for j in range(i + 1, len(axes)):
        axes[j].axis('off')

    sns.despine()
    # plt.tight_layout() # handled by figure.constrained_layout.use
    plt.show()
