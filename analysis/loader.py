import os
import functools
from typing import Tuple, Optional, Any, Dict
from datetime import datetime

import gspread
import polars as pl
from google.oauth2.service_account import Credentials
from dotenv import load_dotenv

# Type aliases
SheetRecords = list[dict[str, Any]]


def _get_env_var(key: str) -> str:
    """Retrieves an environment variable or raises ValueError if missing."""
    value = os.getenv(key)
    if not value:
        raise ValueError(f"Missing required environment variable: {key}")
    return value


@functools.lru_cache(maxsize=1)
def get_google_client() -> gspread.Client:
    """
    Authenticates with Google Sheets API using service account credentials.
    Result is cached to avoid re-authentication overhead.
    """
    load_dotenv()
    
    email = _get_env_var('GOOGLE_SERVICE_ACCOUNT_EMAIL')
    private_key = _get_env_var('GOOGLE_PRIVATE_KEY').replace('\\n', '\n')

    credentials_config = {
        "type": "service_account",
        "client_email": email,
        "private_key": private_key,
        "token_uri": "https://oauth2.googleapis.com/token",
    }
    
    creds = Credentials.from_service_account_info(
        credentials_config, 
        scopes=['https://www.googleapis.com/auth/spreadsheets']
    )
    return gspread.authorize(creds)


def _fetch_sheet_as_df(
    client: gspread.Client, 
    spreadsheet_id: str, 
    worksheet_name: str,
    datetime_cols: Optional[list[str]] = None,
    date_cols: Optional[list[str]] = None
) -> pl.DataFrame:
    """
    Fetches a specific worksheet and converts it to a Polars DataFrame with type casting.
    """
    try:
        sh = client.open_by_key(spreadsheet_id)
        worksheet = sh.worksheet(worksheet_name)
        records: SheetRecords = worksheet.get_all_records()
        
        df = pl.DataFrame(records)
        
        if df.is_empty():
            return df
            
        conversions = []
        if datetime_cols:
            conversions.extend([
                pl.col(col).str.strptime(pl.Datetime, format="%Y/%m/%d %H:%M:%S", strict=False)
                for col in datetime_cols if col in df.columns
            ])
            
        if date_cols:
            conversions.extend([
                pl.col(col).str.strptime(pl.Date, format="%Y/%m/%d", strict=False)
                for col in date_cols if col in df.columns
            ])
            
        return df.with_columns(conversions) if conversions else df

    except gspread.exceptions.WorksheetNotFound:
        print(f"Warning: Worksheet '{worksheet_name}' not found.")
        return pl.DataFrame()
    except Exception as e:
        print(f"Error loading '{worksheet_name}': {e}")
        return pl.DataFrame()


def load_data() -> Tuple[pl.DataFrame, pl.DataFrame]:
    """
    Main entry point to load analysis data.
    
    Returns:
        Tuple[pl.DataFrame, pl.DataFrame]: (df_occupancy, df_open)
    """
    client = get_google_client()
    spreadsheet_id = _get_env_var('OCCUPANCY_SPREADSHEET_ID')

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

    return df_occupancy, df_open
