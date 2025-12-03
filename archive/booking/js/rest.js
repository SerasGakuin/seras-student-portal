/**
 * 休み登録ロジック
 */
import { App } from './app.js';

export function init() {
    setupEventListeners();
    // 日付入力の初期値を今日に設定
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('restDate').value = today;
}

/**
 * イベントリスナーの設定
 */
function setupEventListeners() {
    const form = document.getElementById('restForm');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleSubmit();
    });
}

/**
 * フォーム送信処理
 */
async function handleSubmit() {
    if (!App.currentUser) {
        App.showError('ユーザー情報が取得できていません。再読み込みしてください。');
        return;
    }

    // フォーム値の取得
    const date = document.getElementById('restDate').value;

    // バリデーション
    if (!date) {
        App.showError('日付を選択してください。');
        return;
    }

    // 送信データ構築
    const payload = {
        action: 'registerRestDay',
        userId: App.currentUser.userId,
        date: date
    };

    // 送信処理
    App.showLoading(true);
    try {
        const result = await App.sendData(payload);

        if (result.status === 'ok') {
            alert('休み登録が完了しました！');
            formReset();
            App.showScreen('menuScreen');
        } else {
            throw new Error(result.message || '不明なエラー');
        }
    } catch (e) {
        App.showError('登録に失敗しました: ' + e.message);
    } finally {
        App.showLoading(false);
    }
}

/**
 * フォームのリセット
 */
function formReset() {
    document.getElementById('restForm').reset();
    // 日付を今日に戻す
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('restDate').value = today;
}
