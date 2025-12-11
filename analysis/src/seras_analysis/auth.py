import functools
import gspread
from google.oauth2.service_account import Credentials
from . import config

@functools.lru_cache(maxsize=1)
def get_google_client() -> gspread.Client:
    """
    Google Sheets APIのクライアントを取得および認証します。
    結果はキャッシュされ、再認証のオーバーヘッドを回避します。
    
    Returns:
        gspread.Client: 認証済みのgspreadクライアント
    """
    credentials_config = {
        "type": "service_account",
        "client_email": config.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        "private_key": config.GOOGLE_PRIVATE_KEY,
        "token_uri": "https://oauth2.googleapis.com/token",
    }
    
    creds = Credentials.from_service_account_info(
        credentials_config, 
        scopes=['https://www.googleapis.com/auth/spreadsheets']
    )
    return gspread.authorize(creds)
