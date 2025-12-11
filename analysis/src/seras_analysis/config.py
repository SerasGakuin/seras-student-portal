import os
from pathlib import Path
from dotenv import load_dotenv

# .envファイルの読み込み
# analysisディレクトリ直下、またはプロジェクトルートの.envを探す
env_path = Path(__file__).parent.parent.parent / '.env'
if not env_path.exists():
    env_path = Path(__file__).parent.parent.parent.parent / '.env'

load_dotenv(dotenv_path=env_path)

def get_env_var(key: str, default: str | None = None) -> str:
    """
    環境変数を取得します。
    
    Args:
        key (str): 環境変数のキー
        default (str | None): デフォルト値（指定がない場合、キーが存在しないとエラーになります）
    
    Returns:
        str: 環境変数の値
        
    Raises:
        ValueError: 環境変数が見つからず、デフォルト値も指定されていない場合
    """
    value = os.getenv(key)
    if value is None:
        if default is not None:
            return default
        raise ValueError(f"必須の環境変数が見つかりません: {key}")
    return value

# 設定値
SPREADSHEET_ID = get_env_var('OCCUPANCY_SPREADSHEET_ID')
GOOGLE_SERVICE_ACCOUNT_EMAIL = get_env_var('GOOGLE_SERVICE_ACCOUNT_EMAIL')
GOOGLE_PRIVATE_KEY = get_env_var('GOOGLE_PRIVATE_KEY').replace('\\n', '\n')
