/**
 * LIFF初期化・認証管理モジュール
 */
import { CONFIG } from './config.js';

// ユーザープロファイルを保持する変数
let currentUser = null;

/**
 * LIFFを初期化する
 * @returns {Promise<Object>} ユーザープロファイル
 */
export async function initLiff() {
    console.log('LIFF initialization started...');

    // LIFF IDが設定されていない、またはダミーの場合
    if (!CONFIG.LIFF_ID || CONFIG.LIFF_ID === 'YOUR_LIFF_ID_HERE') {
        if (CONFIG.DEV_MODE) {
            console.warn('LIFF ID not set. Running in DEV_MODE with dummy data.');
            currentUser = CONFIG.DUMMY_USER;
            return currentUser;
        } else {
            throw new Error('LIFF ID is not configured.');
        }
    }

    try {
        // LIFF SDKのロード待ち（CDNで読み込んでいる前提）
        if (!window.liff) {
            throw new Error('LIFF SDK not loaded.');
        }

        // LIFF初期化
        await liff.init({ liffId: CONFIG.LIFF_ID });

        // ログインチェック
        if (!liff.isLoggedIn()) {
            console.log('User not logged in. Redirecting to login...');
            liff.login();
            return null; // ログインページへリダイレクトされるため、ここはnullを返す
        }

        // プロファイル取得
        const profile = await liff.getProfile();
        currentUser = {
            userId: profile.userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl
        };

        console.log('LIFF initialized successfully.', currentUser);
        return currentUser;

    } catch (error) {
        console.error('LIFF initialization failed:', error);

        // エラー時も開発モードならダミーデータを返す
        if (CONFIG.DEV_MODE) {
            console.warn('Falling back to dummy data due to initialization error.');
            currentUser = CONFIG.DUMMY_USER;
            return currentUser;
        }

        throw error;
    }
}

/**
 * 現在のユーザー情報を取得
 * @returns {Object|null}
 */
export function getCurrentUser() {
    return currentUser;
}

/**
 * ウィンドウを閉じる
 */
export function closeWindow() {
    if (window.liff && liff.closeWindow) {
        liff.closeWindow();
    } else {
        console.log('liff.closeWindow() called (mock).');
        window.close();
    }
}
