export const CONFIG = {
    LINE_CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    SPREADSHEET: {
        STUDENT: {
            ID: process.env.STUDENT_SPREADSHEET_ID || '',
        },
        OCCUPANCY: {
            ID: process.env.OCCUPANCY_SPREADSHEET_ID || '',
            SHEETS: {
                OCCUPANCY: '在室人数',
                OPEN_LOGS: 'open_logs',
            },
            MAX_CAPACITY: {
                BUILDING_1: 20, // Example capacity
                BUILDING_2: 15,
            },
        },
    },
    REMINDER: {
        AUTO_OPEN: {
            EXCLUDE_DAYS: [5], // Friday (0=Sun, 1=Mon... 5=Fri)
            TARGET_TIME_JST: '14:30', // Contextual info, controlled by Cron Schedule
        }
    },
    PERMISSIONS: {
        // Who can see the list of students currently in the room
        VIEW_OCCUPANCY_MEMBERS: ['教室長', '在塾(講師)'], // 生徒を足すなら"在塾"を追加
        // Who can toggle Open/Close status (Building 1 & 2)
        OPERATE_BUILDING_STATUS: ['教室長'],
    },
    API: {
        OCCUPANCY: '/api/occupancy',
        RESERVE_MEETING: '/api/reserveMeeting',
        REGISTER_REST_DAY: '/api/registerRestDay',
    },
    TIME_OPTIONS: [
        { value: 'T14:00:00', label: '午前~15:00' },
        { value: 'T15:00:00', label: '15:00~16:00' },
        { value: 'T16:00:00', label: '16:00~17:00' },
        { value: 'T17:00:00', label: '17:00~18:00' },
        { value: 'T18:00:00', label: '18:00~19:00' },
        { value: 'T19:00:00', label: '19:00~20:00' },
        { value: 'T20:00:00', label: '20:00~21:00' },
        { value: 'T21:00:00', label: '21:00~22:00' },
        { value: 'T22:00:00', label: '22:00~23:00' },
    ] as const,
    MEETING_TYPES: [
        { value: '面談', label: '面談' },
        { value: '特訓', label: '特訓' },
        { value: '強制通塾', label: '強制通塾' },
    ] as const,
};
