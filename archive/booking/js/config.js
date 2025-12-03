/**
 * 予約システム設定ファイル
 */

export const CONFIG = {
    // LIFF ID (LINE Developers Consoleで取得)
    // 未取得の場合はダミー値を設定し、liff-init.jsでダミーモードとして動作させる
    LIFF_ID: 'YOUR_LIFF_ID_HERE',

    // GAS WebアプリのURL
    API_URL: 'https://script.google.com/macros/s/AKfycbxDx1mk_jJAu6sdg4v9EUOgZrHzHAuRiSDLzGYbvV9GYsiqPxiuy1NzeFxAjPr3moaE/exec',

    // 開発モード (trueの場合、LIFF IDがなくても動作確認可能)
    DEV_MODE: true,

    // モックAPIを使用するかどうか (trueならGASに投げずに成功を返す)
    // GASの動作確認をする場合は false にする
    USE_MOCK_API: false,

    // ダミーユーザーデータ (DEV_MODE時に使用)
    DUMMY_USER: {
        userId: 'xxxxxxx', // LINE ID
        displayName: 'テストユーザー',
        pictureUrl: ''
    }
};

