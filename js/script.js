/**
 * Seras学院 自習室在室人数モニター
 * メインスクリプト
 */

import { CONFIG } from './config.js';

/**
 * サーバーから在室人数データを取得し、画面を更新する非同期関数
 */
async function fetchOccupancy() {
    try {
        if (CONFIG.DEBUG_MODE) {
            console.log("Fetching data from:", CONFIG.API_URL);
        }

        // キャッシュ無効化して最新データを取得
        const response = await fetch(CONFIG.API_URL, { cache: "no-store" });

        if (CONFIG.DEBUG_MODE) {
            console.log("Response status:", response.status);
            console.log("Response ok:", response.ok);
        }

        if (!response.ok) {
            throw new Error(`Network Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (CONFIG.DEBUG_MODE) {
            console.log("Received data:", data);
        }

        // 1号館と2号館のカードを更新
        updateCard("1", data.building1, CONFIG.CAPACITIES.building1);
        updateCard("2", data.building2, CONFIG.CAPACITIES.building2);

        // 最終更新時刻の表示更新
        const time = new Date(data.timestamp).toLocaleTimeString("ja-JP", {
            hour: '2-digit',
            minute: '2-digit'
        });
        document.getElementById("lastUpdated").textContent = "最終更新: " + time;

        // エラー表示を非表示にする
        document.getElementById("errorDisplay").style.display = "none";

    } catch (e) {
        console.error("Error details:", e);

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
    if (ratio <= CONFIG.STATUS_THRESHOLDS.low) {
        status = CONFIG.STATUS_CONFIG.low;
    } else if (ratio <= CONFIG.STATUS_THRESHOLDS.mid) {
        status = CONFIG.STATUS_CONFIG.mid;
    } else {
        status = CONFIG.STATUS_CONFIG.high;
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

// 設定された間隔でデータを更新
setInterval(fetchOccupancy, CONFIG.UPDATE_INTERVAL);
