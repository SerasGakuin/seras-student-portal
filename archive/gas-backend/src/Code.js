/**
 * Seras学院 予約システム バックエンドAPI
 */

/**
 * WebアプリへのPOSTリクエストを処理
 */
function doPost(e) {
    // CORS対策（レスポンスヘッダー用）
    // GASのWebアプリはリダイレクトされるため、クライアント側でのCORS制御は限定的だが、
    // 明示的にJSONを返すことでfetch APIでの扱いを容易にする

    try {
        // リクエストボディのパース
        if (!e || !e.postData) {
            throw new Error('No post data received');
        }

        const params = JSON.parse(e.postData.contents);
        const action = params.action;
        const userId = params.userId;

        if (!userId) {
            throw new Error('User ID is missing');
        }

        // 生徒情報の取得
        const studentMaster = new StudentMasterLib.studentMaster();
        const nameFromLib = studentMaster.getStudentNameFromLineId(userId);
        const studentName = nameFromLib || '未登録生徒';

        let result = {};

        // アクション分岐
        if (action === 'reserveMeeting') {
            result = handleReserveMeeting(params, studentName);
        } else if (action === 'registerRestDay') {
            result = handleRegisterRestDay(params, studentName);
        } else {
            throw new Error('Invalid action: ' + action);
        }

        return createJsonResponse({
            status: 'ok',
            data: result
        });

    } catch (error) {
        console.error('Error:', error);
        return createJsonResponse({
            status: 'error',
            message: error.toString()
        });
    }
}

/**
 * JSONレスポンスの生成
 */
function createJsonResponse(data) {
    return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 面談予約処理
 */
function handleReserveMeeting(params, studentName) {
    const date = params.date; // YYYY-MM-DD
    const startTime = params.arrivalTime.replace('T', ''); // HH:mm:ss
    const endTime = params.leaveTime.replace('T', '');
    const type = params.meetingType;

    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(`${date}T${endTime}`);

    const title = `【${type}】${studentName}`;
    const description = `予約システムからの登録\nタイプ: ${type}\n生徒名: ${studentName}`;

    // カレンダー登録
    const event = CalendarApp.getDefaultCalendar().createEvent(
        title,
        startDateTime,
        endDateTime,
        { description: description }
    );

    return {
        eventId: event.getId(),
        title: title,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString()
    };
}

/**
 * 休み登録処理
 */
function handleRegisterRestDay(params, studentName) {
    const dateStr = params.date;
    const date = new Date(dateStr);
    const title = `【休み】${studentName}`;

    // 終日イベントとして登録
    const event = CalendarApp.getDefaultCalendar().createAllDayEvent(
        title,
        date,
        { description: `予約システムからの登録\n生徒名: ${studentName}` }
    );

    return {
        eventId: event.getId(),
        title: title,
        date: dateStr
    };
}


