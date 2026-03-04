# 分析環境 (Python / Jupyter)

## 概要

Webアプリ（`src/app/analysis/`）とは別に、**探索的データ分析**を行うためのPython環境です。

| 環境 | 目的 | 場所 |
|:---|:---|:---|
| **Webアプリ** | 定常的なデータ分析（ヒートマップ、月間ランキング等） | `src/app/analysis/` |
| **Python/Jupyter** | 探索的・実験的な分析（新しい可視化の試作、統計的検定等） | `analysis/` |

Webアプリの分析ページが充実したため、Python環境は主にプロトタイピングや一時的な調査に使用します。

## 環境構築

### 前提条件

- Python 3.12+
- [uv](https://docs.astral.sh/uv/) (Pythonパッケージマネージャー)

### セットアップ

```bash
cd analysis/

# 仮想環境の作成と依存パッケージのインストール
uv sync

# 環境変数の設定
cp .env.example .env
# .env に Google Sheets API の認証情報を設定
```

### 環境変数 (`.env`)

```env
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}  # Google Sheets API キー (JSON)
SPREADSHEET_ID=xxxxxxxxxxxx                                 # スプレッドシートID
```

## ディレクトリ構成

```
analysis/
├── notebooks/
│   ├── occupancy_analysis.ipynb   # 在室状況の可視化・統計分析
│   └── open_analysis.ipynb        # 開館パターンの分析
├── src/seras_analysis/            # 共有Pythonモジュール
│   ├── __init__.py
│   ├── auth.py                    # Google Sheets API 認証
│   ├── config.py                  # 設定（スプレッドシートID等）
│   ├── data_loader.py             # スプレッドシートからのデータ読み込み
│   ├── preprocessing.py           # データ前処理（型変換、フィルタリング）
│   └── plotting.py                # 可視化ユーティリティ（Seaborn/Matplotlib）
├── pyproject.toml                 # uv による依存管理
├── uv.lock                        # ロックファイル
├── .python-version                # Python 3.12
├── .env                           # 環境変数（gitignore済み）
└── .venv/                         # 仮想環境（自動生成）
```

## 各モジュールの説明

| モジュール | 説明 |
|:---|:---|
| `auth.py` | Google Sheets API のサービスアカウント認証 |
| `config.py` | `.env` からの設定読み込み、スプレッドシートID管理 |
| `data_loader.py` | gspread でスプレッドシートを読み込み、Polars DataFrame に変換 |
| `preprocessing.py` | 型キャスト、日付パース、15分間隔スナップショット生成 |
| `plotting.py` | 日次トレンド、ヒートマップ、日次内訳の可視化関数（Seaborn + japanize-matplotlib） |

## Notebook 概要

### `occupancy_analysis.ipynb`
在室状況の包括的な分析。日次トレンド（平日/休日別）、曜日×時間帯ヒートマップ、日次内訳グラフを生成。Webアプリの分析ページのプロトタイプとして開発。

### `open_analysis.ipynb`
開館パターンの分析。開館時刻の分布や曜日別の傾向を可視化。

## 注意事項

- `.venv` 作成時に jupyter パッケージの依存関係で警告が表示されることがありますが、**無害です**（実行に影響なし）
- Notebook の出力セルはコミット前にクリアしてください（ファイルサイズ削減のため）
- データの読み込みには Google Sheets API の認証情報が必要です。`.env` ファイルが正しく設定されていることを確認してください
