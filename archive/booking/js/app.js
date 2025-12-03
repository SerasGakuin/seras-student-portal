/**
 * 予約システム メインアプリケーションロジック
 * 共通機能と状態管理を提供します。
 */
import { initLiff } from './liff-init.js';
import { CONFIG } from './config.js';

export const App = {
    currentUser: null,

    /**
     * アプリケーション初期化
     * @returns {Promise<void>}
     */
    async init() {
        console.log('App initializing...');
        this.showLoading(true);

        try {
            // LIFF初期化とユーザー取得
            const user = await initLiff();
            this.currentUser = user;

            this.updateUserInfo(user);

            console.log('App initialized successfully');

        } catch (e) {
            console.error('App initialization failed:', e);
            this.showError('アプリケーションの起動に失敗しました: ' + e.message);
            this.updateUserInfo(null);
        } finally {
            this.showLoading(false);
        }
    },

    /**
     * ユーザー情報の表示更新
     * @param {Object|null} user 
     */
    updateUserInfo(user) {
        const el = document.getElementById('userInfo');
        if (!el) return;

        if (user) {
            el.textContent = `${user.displayName} さん`;
        } else {
            el.textContent = 'ゲスト さん';
        }
    },

    /**
     * 画面切り替え
     * @param {string} screenId - 表示する画面のID
     */
    showScreen(screenId) {
        // すべての画面を非表示
        document.querySelectorAll('.screen').forEach(el => {
            el.classList.remove('active');
        });

        // 指定された画面を表示
        const target = document.getElementById(screenId);
        if (target) {
            target.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    },

    // HTMLのonclickから呼ばれるショートカットメソッド
    showMenu() {
        this.showScreen('menuScreen');
    },

    showMeetingForm() {
        this.showScreen('meetingScreen');
    },

    showRestForm() {
        this.showScreen('restScreen');
    },

    /**
     * ローディング表示の切り替え
     * CSS transitionend イベントを利用してアニメーション完了後に非表示にする
     * @param {boolean} isVisible 
     */
    showLoading(isVisible) {
        const el = document.getElementById('loading');
        if (!el) return;

        if (isVisible) {
            el.style.display = 'flex';
            // ブラウザの描画更新を待ってからクラスを付与（フェードイン用）
            requestAnimationFrame(() => {
                el.classList.add('visible');
            });
        } else {
            el.classList.remove('visible');

            // アニメーション終了を待って display: none にする
            const onTransitionEnd = () => {
                el.style.display = 'none';
                el.removeEventListener('transitionend', onTransitionEnd);
            };
            el.addEventListener('transitionend', onTransitionEnd);
        }
    },

    /**
     * エラーメッセージの表示
     * @param {string} message 
     */
    showError(message) {
        alert(message);
    },

    /**
     * GAS APIへのデータ送信（共通処理）
     * @param {Object} data - 送信データ
     * @returns {Promise<Object>} レスポンスデータ
     */
    async sendData(data) {
        if (CONFIG.USE_MOCK_API) {
            console.log('Mock API Call:', data);
            await new Promise(resolve => setTimeout(resolve, 800)); // 擬似的な遅延
            return { status: 'ok', message: 'Mock success' };
        }

        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (e) {
            console.error('API Error:', e);
            throw e;
        }
    }
};

// グローバル公開（HTMLからの呼び出し用）
window.app = App;

// DOM読み込み完了時に初期化
window.addEventListener('DOMContentLoaded', () => {
    App.init();
});
