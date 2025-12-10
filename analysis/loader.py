import os
import gspread
import polars as pl
from google.oauth2.service_account import Credentials
from dotenv import load_dotenv

def get_google_client():
    load_dotenv()
    
    # Check required env vars
    email = os.getenv('GOOGLE_SERVICE_ACCOUNT_EMAIL')
    private_key = os.getenv('GOOGLE_PRIVATE_KEY')
    
    if not email or not private_key:
        raise ValueError("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY")

    credentials_config = {
        "type": "service_account",
        "client_email": email,
        "private_key": private_key.replace('\\n', '\n'),
        "token_uri": "https://oauth2.googleapis.com/token",
    }
    
    creds = Credentials.from_service_account_info(
        credentials_config, 
        scopes=['https://www.googleapis.com/auth/spreadsheets']
    )
    return gspread.authorize(creds)

def load_data():
    """
    Loads occupancy_logs and open_logs from Google Sheets into Polars DataFrames
    with proper type casting for Timestamps and Dates.
    """
    gc = get_google_client()
    spreadsheet_id = os.getenv('OCCUPANCY_SPREADSHEET_ID')
    
    if not spreadsheet_id:
        raise ValueError("Missing OCCUPANCY_SPREADSHEET_ID")
        
    sh = gc.open_by_key(spreadsheet_id)

    # --- Load Occupancy Logs ---
    raw_occupancy = sh.worksheet('occupancy_logs').get_all_records()
    df_occupancy = pl.DataFrame(raw_occupancy)
    
    # Type conversion
    if not df_occupancy.is_empty():
        df_occupancy = df_occupancy.with_columns([
            pl.col("Timestamp").str.strptime(pl.Datetime, format="%Y/%m/%d %H:%M:%S", strict=False),
            pl.col("Date").str.strptime(pl.Date, format="%Y/%m/%d", strict=False)
        ])

    # --- Load Open Logs ---
    raw_open = sh.worksheet('open_logs').get_all_records()
    df_open = pl.DataFrame(raw_open)
    
    # Type conversion
    if not df_open.is_empty():
        df_open = df_open.with_columns([
            pl.col("Timestamp").str.strptime(pl.Datetime, format="%Y/%m/%d %H:%M:%S", strict=False),
        ])

    return df_occupancy, df_open
