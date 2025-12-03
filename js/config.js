/**
 * アプリケーション設定ファイル
 * 
 * このファイルで設定値を一元管理します。
 * 環境に応じて値を変更してください。
 */

// 環境判定（開発環境かどうか）
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

/**
 * アプリケーション設定オブジェクト
 */
export const CONFIG = {
    // === API設定 ===

    /**
     * Google Apps Script WebアプリのURL
     * 本番環境のURL（GitHub Pagesで使用）
     */
    API_URL_PRODUCTION: "https://script.google.com/macros/s/AKfycbz8_KP_SevWBym9rk1omza08XnPWtzefmz4Qro3hERYdUe9JRU4y9ivyZ4FqSg6syEXaA/exec?mode=json",

    /**
     * 開発環境用のAPI URL（必要に応じて変更）
     * 開発時は本番と同じURLを使用
     */
    API_URL_DEVELOPMENT: "https://script.google.com/macros/s/AKfycbz8_KP_SevWBym9rk1omza08XnPWtzefmz4Qro3hERYdUe9JRU4y9ivyZ4FqSg6syEXaA/exec?mode=json",

    /**
     * 現在の環境に応じたAPI URL
     */
    get API_URL() {
        return isDevelopment ? this.API_URL_DEVELOPMENT : this.API_URL_PRODUCTION;
    },

    // === 定員設定 ===

    /**
     * 各号館の定員
     */
    CAPACITIES: {
        building1: 20, // 本館の定員
        building2: 12  // 2号館の定員
    },

    // === 更新設定 ===

    /**
     * データ更新間隔（ミリ秒）
     * デフォルト: 5000ms (5秒)
     */
    UPDATE_INTERVAL: 5000,

    // === 混雑状況の閾値設定 ===

    /**
     * 混雑状況を判定する閾値
     * low: 0 ~ 33%
     * mid: 34 ~ 66%
     * high: 67 ~ 100%
     */
    STATUS_THRESHOLDS: {
        low: 0.33,
        mid: 0.66
    },

    /**
     * 混雑状況の表示設定
     */
    STATUS_CONFIG: {
        low: {
            text: "空いています",
            color: "var(--status-low)"
        },
        mid: {
            text: "やや混雑しています",
            color: "var(--status-mid)"
        },
        high: {
            text: "混雑しています",
            color: "var(--status-high)"
        }
    },

    // === デバッグ設定 ===

    /**
     * デバッグモード
     * true: コンソールにログを出力
     * false: ログを出力しない
     */
    DEBUG_MODE: isDevelopment
};
