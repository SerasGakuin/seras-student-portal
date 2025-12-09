export const CONFIG = {
    SPREADSHEET: {
        STUDENT: {
            ID: process.env.STUDENT_SPREADSHEET_ID || '',
        },
        OCCUPANCY: {
            ID: process.env.OCCUPANCY_SPREADSHEET_ID || '',
            SHEETS: {
                OCCUPANCY: '在室人数',
            },
        },
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
