# Seras学院 自習室在室人数モニター

Seras学院の自習室（1号館・2号館）の在室人数をリアルタイムで表示するWebアプリケーションです。

## 概要

生徒が自習室の混雑状況をひと目で確認できるように、定員に対する利用率を視覚的に表示します。
5秒ごとに最新のデータを取得し、画面を更新します。

## 技術スタック

*   **Frontend**: HTML5, CSS3, Vanilla JavaScript
*   **Backend**: Google Apps Script (GAS)

## バックエンドについて

バックエンドのロジックは、Googleスプレッドシート「指導報告ログ」に紐付いたGASプロジェクト内にあります。
該当するスクリプトファイル名は `6_occupancyWebApp.gs` です。
このスクリプトがWebアプリとしてデプロイされており、JSON形式で在室人数データを返却します。

## ディレクトリ構成

```
.
├── index.html      # メインページ
├── css/
│   └── style.css   # スタイルシート
├── js/
│   └── script.js   # アプリケーションロジック
└── images/
    ├── mogura_icon.png      # ファビコン画像
    ├── mogura_insert.png    # 本館カード装飾用モグラ画像
    └── mogura_insert_2.png  # ガイドカード装飾用モグラ画像
```
