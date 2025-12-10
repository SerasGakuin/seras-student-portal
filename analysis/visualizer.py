from typing import Optional, Union
from datetime import date

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
