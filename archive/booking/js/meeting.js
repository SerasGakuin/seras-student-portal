/**
 * 面談予約ロジック
 */
import { App } from './app.js';

/**
 * 初期化
 */
export function init() {
    initDateOptions();
    setupEventListeners();
}

/**
 * イベントリスナーの設定
 */
function setupEventListeners() {
    const form = document.getElementById('meetingForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleSubmit();
    });
}

/**
 * 日付選択肢の生成（今日から7日分）
 */
function initDateOptions() {
    const select = document.getElementById('meetingDate');
    if (!select) return;

    select.innerHTML = '<option value="">日付を選択...</option>'; // リセット

    const today = new Date();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

    for (let i = 0; i < 7; i++) {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
        const yyyy = d.getFullYear();
        const mm = ('0' + (d.getMonth() + 1)).slice(-2);
        const dd = ('0' + d.getDate()).slice(-2);
        const w = weekdays[d.getDay()];

        const option = document.createElement('option');
        option.value = `${yyyy}-${mm}-${dd}`;
        option.textContent = `${mm}/${dd}(${w})`;
        select.appendChild(option);
    }
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
    const formData = {
        type: document.getElementById('meetingType').value,
        date: document.getElementById('meetingDate').value,
        arrival: document.getElementById('arrivalTime').value,
        leave: document.getElementById('leaveTime').value
    };

    // バリデーション
    const error = validateForm(formData);
    if (error) {
        App.showError(error);
        return;
    }

    // 送信データ構築
    const payload = {
        action: 'reserveMeeting',
        userId: App.currentUser.userId,
        meetingType: formData.type,
        date: formData.date,
        arrivalTime: formData.arrival,
        leaveTime: formData.leave
    };

    // 送信処理
    App.showLoading(true);
    try {
        const result = await App.sendData(payload);

        if (result.status === 'ok') {
            alert('予約が完了しました！');
            formReset();
            App.showScreen('menuScreen');
        } else {
            throw new Error(result.message || '不明なエラー');
        }
    } catch (e) {
        App.showError('予約に失敗しました: ' + e.message);
    } finally {
        App.showLoading(false);
    }
}

/**
 * バリデーション
 * @param {Object} data 
 * @returns {string|null} エラーメッセージ（なければnull）
 */
function validateForm(data) {
    if (!data.date) {
        return '日付を選択してください。';
    }

    if (data.arrival >= data.leave) {
        return '退塾時間は来塾時間より後に設定してください。';
    }

    return null;
}

/**
 * フォームのリセット
 */
function formReset() {
    document.getElementById('meetingForm').reset();
}
