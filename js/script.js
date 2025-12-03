// Google Apps Script (GAS) のWebアプリURL
const BASE_URL = "https://script.google.com/macros/s/AKfycbz8_KP_SevWBym9rk1omza08XnPWtzefmz4Qro3hERYdUe9JRU4y9ivyZ4FqSg6syEXaA/exec";
// JSONモードでデータを取得するためのパラメータを追加
const API_URL = BASE_URL + "?mode=json";

// 各号館の定員設定
const CAPACITIES = {
    building1: 20, // 1号館の定員
    building2: 12  // 2号館の定員
};

// 混雑状況の閾値と表示設定
// low: 空き (0-33%)
// mid: やや混雑 (34-66%)
// high: 混雑 (67-100%)
const STATUS_CONFIG = {
    low: { text: "空いています", color: "var(--status-low)" },
    mid: { text: "やや混雑しています", color: "var(--status-mid)" },
    high: { text: "混雑しています", color: "var(--status-high)" }
};

/**
 * サーバーから在室人数データを取得し、画面を更新する非同期関数
 */
async function fetchOccupancy() {
    try {
        console.log("Fetching data from:", API_URL); // デバッグ用

        // キャッシュ無効化して最新データを取得
        const response = await fetch(API_URL, { cache: "no-store" });

        console.log("Response status:", response.status); // デバッグ用
        console.log("Response ok:", response.ok); // デバッグ用

        if (!response.ok) {
            throw new Error(`Network Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Received data:", data); // デバッグ用

        // 1号館と2号館のカードを更新
        updateCard("1", data.building1, CAPACITIES.building1);
        updateCard("2", data.building2, CAPACITIES.building2);

        // 最終更新時刻の表示更新
        const time = new Date(data.timestamp).toLocaleTimeString("ja-JP", { hour: '2-digit', minute: '2-digit' });
        document.getElementById("lastUpdated").textContent = "最終更新: " + time;

        // エラー表示を非表示にする
        document.getElementById("errorDisplay").style.display = "none";

    } catch (e) {
        console.error("Error details:", e); // 詳細なエラー情報
        // エラー発生時のユーザーへの通知
        const err = document.getElementById("errorDisplay");
        err.textContent = "データの更新に失敗しました: " + e.message;
        err.style.display = "block";
    }
}

/**
 * 個別のカードの表示を更新する関数
 * @param {string} idSuffix - HTML要素のID接尾辞 ("1" or "2")
 * @param {number} count - 現在の在室人数
 * @param {number} max - 定員
 */
function updateCard(idSuffix, count, max) {
    const numEl = document.getElementById("num" + idSuffix);
    const maxEl = document.getElementById("max" + idSuffix); // 定員表示用要素
    const badgeEl = document.getElementById("badge" + idSuffix);
    const barEl = document.getElementById("bar" + idSuffix);

    // 人数表示の更新
    numEl.textContent = count;
    // 定員表示の更新
    maxEl.textContent = max;

    // 混雑率の計算
    const ratio = count / max;
    let status;

    // 混雑率に応じたステータスの決定
    if (ratio <= 0.33) {
        status = STATUS_CONFIG.low;
    } else if (ratio <= 0.66) {
        status = STATUS_CONFIG.mid;
    } else {
        status = STATUS_CONFIG.high;
    }

    // バッジ（テキストと背景色）の更新
    badgeEl.textContent = status.text;
    badgeEl.style.background = status.color;

    // プログレスバーの更新（最大100%）
    const percent = Math.min(ratio * 100, 100);
    barEl.style.width = percent + "%";
    barEl.style.backgroundColor = status.color;
}

// 初回実行
fetchOccupancy();

// 5秒ごとにデータを更新
setInterval(fetchOccupancy, 5000);
