from typing import Optional, Union, List, Tuple
from datetime import date, datetime
import math
import polars as pl
import matplotlib.pyplot as plt
from matplotlib.ticker import MaxNLocator
import seaborn as sns

# Set refined, paper-like theme
sns.set_theme(style="whitegrid", context="paper", font_scale=1.2)
sns.set_palette("deep")

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
    ax.set_title(title, fontsize=12, fontweight="bold")
    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    
    # Integer Y-axis
    ax.yaxis.set_major_locator(MaxNLocator(integer=True))
    
    # X-axis limits (Standard operating hours)
    ax.set_xlim(6, 23)
    ax.set_xticks(range(6, 24, 3))
    
    ax.grid(True, linestyle=":", alpha=0.4)

def plot_daily_trends(df: pl.DataFrame, start_date: Optional[Union[str, date]] = None) -> None:
    """
    Plots daily occupancy trends (Total only) overlaying all days on one plot.
    Colors are separated by Weekday vs Weekend, with high transparency.
    """
    from matplotlib.lines import Line2D
    
    df_sorted, unique_dates = _prepare_data(df, start_date)
    
    if len(unique_dates) == 0:
        print("No data to plot.")
        return

    plt.figure(figsize=(10, 6))
    ax = plt.gca()
    
    # Define colors
    c_weekday = sns.color_palette("muted")[0] # Blue
    c_weekend = sns.color_palette("muted")[3] # Red

    for d in unique_dates:
        day_df = df_sorted.filter(pl.col("Date") == d)
        
        # X-axis: decimal hours
        hours = day_df["Timestamp"].dt.hour()
        minutes = day_df["Timestamp"].dt.minute()
        decimal_time = hours + minutes / 60.0
        
        values = day_df["Total"]
        
        # Determine color based on weekday (Mon=0, Sun=6)
        # 0-4: Weekday, 5-6: Weekend
        is_weekend = d.weekday() >= 5
        color = c_weekend if is_weekend else c_weekday
        
        # Plot with high transparency
        # Set legend=False to avoid cluttering the legend with every single day
        sns.lineplot(x=decimal_time, y=values, linewidth=1.5, color=color, alpha=0.3, ax=ax, legend=False)

    _setup_axis(ax, title="Daily Occupancy Trends (Total)", ylabel="Total Occupancy")
    
    # Custom Legend
    legend_elements = [
        Line2D([0], [0], color=c_weekday, lw=2, label='Weekday'),
        Line2D([0], [0], color=c_weekend, lw=2, label='Weekend (Sat/Sun)')
    ]
    ax.legend(handles=legend_elements, loc='upper left', frameon=True)
    
    sns.despine()
    plt.tight_layout()
    plt.show()

def plot_daily_breakdown(df: pl.DataFrame, start_date: Optional[Union[str, date]] = None) -> None:
    """
    Plots daily occupancy trends with breakdown (Total, Building1, Building2) using Small Multiples.
    """
    df_sorted, unique_dates = _prepare_data(df, start_date)
    
    if len(unique_dates) == 0:
        print("No data to plot.")
        return

    n_cols = 3
    n_rows = math.ceil(len(unique_dates) / n_cols)
    if n_rows == 0: n_rows = 1
    
    # Colors for breakdown
    color_total = "#34495E" # Dark Blue/Grey
    color_b1 = "#3498DB"    # Good Blue
    color_b2 = "#E67E22"    # Orange
    
    fig, axes = plt.subplots(n_rows, n_cols, figsize=(n_cols * 5, n_rows * 3.5), sharey=True)
    axes = axes.flatten() if n_rows * n_cols > 1 else [axes]

    for i, d in enumerate(unique_dates):
        ax = axes[i]
        day_df = df_sorted.filter(pl.col("Date") == d)
        
        hours = day_df["Timestamp"].dt.hour()
        minutes = day_df["Timestamp"].dt.minute()
        decimal_time = hours + minutes / 60.0
        
        b1 = day_df["Building1"]
        b2 = day_df["Building2"]
        total = day_df["Total"]
        
        # Plot lines
        ax.plot(decimal_time, total, color=color_total, linewidth=2, label="Total")
        ax.plot(decimal_time, b1, color=color_b1, linestyle="--", linewidth=1.5, label="Building 1")
        ax.plot(decimal_time, b2, color=color_b2, linestyle=":", linewidth=1.5, label="Building 2")
        
        # Fill
        ax.fill_between(decimal_time, 0, b1, color=color_b1, alpha=0.15)
        ax.fill_between(decimal_time, 0, total, color=color_total, alpha=0.05) # Subtle background fill for total

        day_name = day_df["Day"][0] if "Day" in day_df.columns else ""
        
        ylabel = "Occupancy" if i % n_cols == 0 else ""
        _setup_axis(ax, title=f"{d} ({day_name})", ylabel=ylabel)
        
        # Only show legend on the first plot or if it's not too crowded
        if i == 0:
            ax.legend(loc='upper right', fontsize='x-small', frameon=True, framealpha=0.9)

    # Hide empty subplots
    for j in range(i + 1, len(axes)):
        fig.delaxes(axes[j])

    sns.despine()
    plt.tight_layout()
    plt.show()
