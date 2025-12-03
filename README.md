# Seras学院 自習室在室人数モニター

Seras学院の自習室（1号館・2号館）の在室人数をリアルタイムで表示するWebアプリケーションです。

## 概要

生徒が自習室の混雑状況をひと目で確認できるように、定員に対する利用率を視覚的に表示します。
5秒ごとに最新のデータを取得し、画面を更新します。

## 技術スタック

*   **Frontend**: HTML5, CSS3, Vanilla JavaScript
*   **Backend**: Google Apps Script (GAS)

## バックエンドについて

バックエンドのロジックは、Googleスプレッドシート「在室人数」に紐付いたGASプロジェクト内にあります。
該当するスクリプトファイル名は `1_occupancyWebApp.gs` です。
このスクリプトがWebアプリとしてデプロイされており、JSON形式で在室人数データを返却します。

## ディレクトリ構成

```
.
├── index.html      # メインページ
├── css/
│   └── style.css   # スタイルシート
├── js/
│   ├── config.js   # アプリケーション設定（API URL、定員など）
│   └── script.js   # アプリケーションロジック
└── images/
    ├── mogura_icon.png      # ファビコン画像
    ├── mogura_insert.png    # 本館カード装飾用モグラ画像
    └── mogura_insert_2.png  # ガイドカード装飾用モグラ画像
```

## 設定ファイル

アプリケーションの設定は `js/config.js` で一元管理されています。

### 主な設定項目

- **API_URL**: バックエンドのGAS WebアプリURL
- **CAPACITIES**: 各号館の定員
- **UPDATE_INTERVAL**: データ更新間隔（ミリ秒）
- **STATUS_THRESHOLDS**: 混雑状況の判定閾値
- **DEBUG_MODE**: デバッグログの出力設定

### 環境の自動判定

`config.js` は実行環境を自動判定します：

- **開発環境** (localhost): `API_URL_DEVELOPMENT` を使用、デバッグモードON
- **本番環境** (GitHub Pages): `API_URL_PRODUCTION` を使用、デバッグモードOFF

## 開発環境のセットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/SerasGakuin/occupancy.git
cd occupancy
```

### 2. ローカルサーバーの起動

```bash
npx -y live-server
```

ブラウザが自動的に開き、ファイルの変更を監視して自動リロードします。

### 3. 設定の変更

API URLや定員を変更する場合は、`js/config.js` を編集してください。

```javascript
// 例: 定員を変更
CAPACITIES: {
    building1: 25,  // 本館の定員を25に変更
    building2: 15   // 2号館の定員を15に変更
}
```

## デプロイ

GitHub Pagesに自動デプロイされます。`main` ブランチにプッシュすると、数分後に反映されます。

```bash
git add .
git commit -m "Update configuration"
git push origin main
```

