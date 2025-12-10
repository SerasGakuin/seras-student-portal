from typing import Optional, Union
from datetime import date, datetime
import polars as pl
import matplotlib.pyplot as plt

def plot_daily_trends(df: pl.DataFrame, start_date: Optional[Union[str, date]] = None) -> None:
    """
    Plots daily occupancy trends with one line per day.
    
    Args:
        df: Polars DataFrame containing 'Timestamp', 'Date', 'Total', and 'Day' columns.
            'Timestamp' must be of type Datetime.
        start_date: Optional start date filter (inclusive). Format "YYYY-MM-DD" or date object.
    """
    # Filter by start_date if provided
    if start_date:
        if isinstance(start_date, str):
            start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
        
        # Ensure 'Date' column is of type Date for comparison
        df = df.filter(pl.col("Date") >= start_date)

    # Ensure data is sorted
    df_sorted = df.sort("Timestamp")
    
    # Get unique dates
    unique_dates = df_sorted["Date"].unique().sort()
    
    plt.figure(figsize=(12, 6))
    
    # Iterate over each day and plot its trend
    for d in unique_dates:
        # Filter data for specific date
        day_df = df_sorted.filter(pl.col("Date") == d)
        
        if day_df.is_empty():
            continue
        
        # Create x-axis: Hour + Minute/60 (decimal hours) for continuous time plotting
        # We assume Timestamp is already Datetime type as per loader.py
        hours = day_df["Timestamp"].dt.hour()
        minutes = day_df["Timestamp"].dt.minute()
        decimal_time = hours + minutes / 60.0
        
        values = day_df["Total"]
        
        # Label with Date and Day name
        day_name = day_df["Day"][0] if "Day" in day_df.columns else ""
        label = f"{d} ({day_name})" if day_name else str(d)
        
        plt.plot(decimal_time, values, marker='.', linestyle='-', linewidth=1.5, label=label)

    # Formatting
    plt.title("Daily Occupancy Trends", fontsize=16)
    plt.xlabel("Time of Day (Hour)", fontsize=12)
    plt.ylabel("Total Occupancy (People)", fontsize=12)
    plt.xticks(range(0, 25, 2))  # Tick marks every 2 hours
    plt.xlim(0, 24)
    plt.grid(True, linestyle="--", alpha=0.5)
    plt.legend(title="Date", bbox_to_anchor=(1.05, 1), loc='upper left')
    plt.tight_layout()
    
    plt.show()

def plot_daily_breakdown(df: pl.DataFrame, start_date: Optional[Union[str, date]] = None) -> None:
    """
    Plots daily occupancy trends with breakdown (Total, Building1, Building2) using Small Multiples.
    
    Args:
        df: Polars DataFrame containing 'Timestamp', 'Date', 'Total', 'Building1', 'Building2'.
        start_date: Optional start date filter (inclusive).
    """
    import math
    from matplotlib.ticker import MaxNLocator

    # Filter by start_date
    if start_date:
        if isinstance(start_date, str):
            start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
        df = df.filter(pl.col("Date") >= start_date)

    # Ensure data is sorted
    df_sorted = df.sort("Timestamp")
    
    # Get unique dates
    unique_dates = df_sorted["Date"].unique().sort()
    
    if len(unique_dates) == 0:
        print("No data to plot.")
        return

    # Setup Grid for Small Multiples (e.g., 3 columns)
    n_cols = 3
    n_rows = math.ceil(len(unique_dates) / n_cols)
    
    if n_rows == 0: n_rows = 1
    
    # Premium Colors
    color_total = "#2C3E50"      # Dark Blue-Grey
    color_b1 = "#3498DB"         # Bright Blue
    color_b2 = "#E67E22"         # Carrot Orange
    
    fig, axes = plt.subplots(n_rows, n_cols, figsize=(n_cols * 6, n_rows * 4), sharey=True)
    axes = axes.flatten() if n_rows * n_cols > 1 else [axes]

    for i, d in enumerate(unique_dates):
        ax = axes[i]
        
        # Filter data for specific date
        day_df = df_sorted.filter(pl.col("Date") == d)
        
        # X-axis: decimal hours
        hours = day_df["Timestamp"].dt.hour()
        minutes = day_df["Timestamp"].dt.minute()
        decimal_time = hours + minutes / 60.0
        
        # Data
        b1 = day_df["Building1"]
        b2 = day_df["Building2"]
        total = day_df["Total"]
        
        # Plotting - Stacked Area-like (Lines + Fill)
        # Total Line
        ax.plot(decimal_time, total, color=color_total, linewidth=2, label="Total")
        
        # Building 1 Line
        ax.plot(decimal_time, b1, color=color_b1, linestyle="--", linewidth=1.5, label="Building 1")
        
        # Building 2 Line
        ax.plot(decimal_time, b2, color=color_b2, linestyle=":", linewidth=1.5, label="Building 2")
        
        # Fill areas for emphasis
        ax.fill_between(decimal_time, 0, b1, color=color_b1, alpha=0.1)
        ax.fill_between(decimal_time, b1, total, color=color_b2, alpha=0.1) # Note: this is approximation if Total = B1+B2
        
        # Title & Labels
        day_name = day_df["Day"][0] if "Day" in day_df.columns else ""
        ax.set_title(f"{d} ({day_name})", fontsize=12, fontweight="bold")
        ax.set_xlabel("Hour")
        if i % n_cols == 0:
            ax.set_ylabel("Occupancy")
            
        # Integer Y-axis
        ax.yaxis.set_major_locator(MaxNLocator(integer=True))
        
        # X-axis limits
        ax.set_xlim(6, 23) # Assuming operation hours roughly 6am-11pm
        ax.set_xticks(range(6, 24, 3))
        
        ax.grid(True, linestyle=":", alpha=0.4)
        
        # Legend (only on first plot to save space, or all?)
        # Let's put legend in each or just first. 
        # For readability, maybe internal legend if not too crowded.
        ax.legend(loc='upper right', fontsize='small', frameon=True)

    # Hide empty subplots
    for j in range(i + 1, len(axes)):
        fig.delaxes(axes[j])

    plt.tight_layout()
    plt.show()
