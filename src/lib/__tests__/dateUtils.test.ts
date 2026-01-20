/**
 * dateUtils ユーティリティのテスト
 * Phase 1: setStartOfDay, setEndOfDay, filterLogsByDateRange のテスト
 */

import { setStartOfDay, setEndOfDay, filterLogsByDateRange, toJstString } from '../dateUtils';
import { EntryExitLog } from '@/repositories/interfaces/IOccupancyRepository';

describe('setStartOfDay', () => {
    it('should set time to 00:00:00.000', () => {
        const date = new Date('2025-12-25T15:30:45.123');
        const result = setStartOfDay(date);

        expect(result.getHours()).toBe(0);
        expect(result.getMinutes()).toBe(0);
        expect(result.getSeconds()).toBe(0);
        expect(result.getMilliseconds()).toBe(0);
    });

    it('should preserve the date', () => {
        const date = new Date('2025-12-25T15:30:45.123');
        const result = setStartOfDay(date);

        expect(result.getFullYear()).toBe(2025);
        expect(result.getMonth()).toBe(11); // December is 11
        expect(result.getDate()).toBe(25);
    });

    it('should not mutate the original date', () => {
        const date = new Date('2025-12-25T15:30:45.123');
        const originalTime = date.getTime();
        setStartOfDay(date);

        expect(date.getTime()).toBe(originalTime);
    });

    it('should handle midnight correctly', () => {
        const date = new Date('2025-12-25T00:00:00.000');
        const result = setStartOfDay(date);

        expect(result.getHours()).toBe(0);
        expect(result.getMinutes()).toBe(0);
        expect(result.getSeconds()).toBe(0);
        expect(result.getMilliseconds()).toBe(0);
    });
});

describe('setEndOfDay', () => {
    it('should set time to 23:59:59.999', () => {
        const date = new Date('2025-12-25T15:30:45.123');
        const result = setEndOfDay(date);

        expect(result.getHours()).toBe(23);
        expect(result.getMinutes()).toBe(59);
        expect(result.getSeconds()).toBe(59);
        expect(result.getMilliseconds()).toBe(999);
    });

    it('should preserve the date', () => {
        const date = new Date('2025-12-25T15:30:45.123');
        const result = setEndOfDay(date);

        expect(result.getFullYear()).toBe(2025);
        expect(result.getMonth()).toBe(11);
        expect(result.getDate()).toBe(25);
    });

    it('should not mutate the original date', () => {
        const date = new Date('2025-12-25T15:30:45.123');
        const originalTime = date.getTime();
        setEndOfDay(date);

        expect(date.getTime()).toBe(originalTime);
    });

    it('should handle end of day correctly', () => {
        const date = new Date('2025-12-25T23:59:59.999');
        const result = setEndOfDay(date);

        expect(result.getHours()).toBe(23);
        expect(result.getMinutes()).toBe(59);
        expect(result.getSeconds()).toBe(59);
        expect(result.getMilliseconds()).toBe(999);
    });
});

describe('filterLogsByDateRange', () => {
    const createLog = (entryTime: string, exitTime: string | null = null): EntryExitLog => ({
        entryTime,
        exitTime,
        place: '1',
        name: 'Test Student',
    });

    const testLogs: EntryExitLog[] = [
        createLog('2025-12-20T10:00:00.000Z', '2025-12-20T15:00:00.000Z'),
        createLog('2025-12-25T09:00:00.000Z', '2025-12-25T18:00:00.000Z'),
        createLog('2025-12-26T10:00:00.000Z', '2025-12-26T16:00:00.000Z'),
        createLog('2025-12-30T08:00:00.000Z', '2025-12-30T20:00:00.000Z'),
    ];

    it('should filter logs within date range', () => {
        const start = new Date('2025-12-24T00:00:00.000Z');
        const end = new Date('2025-12-27T23:59:59.999Z');

        const result = filterLogsByDateRange(testLogs, start, end);

        expect(result).toHaveLength(2);
        expect(result[0].entryTime).toBe('2025-12-25T09:00:00.000Z');
        expect(result[1].entryTime).toBe('2025-12-26T10:00:00.000Z');
    });

    it('should return empty array when no logs match', () => {
        const start = new Date('2025-11-01T00:00:00.000Z');
        const end = new Date('2025-11-30T23:59:59.999Z');

        const result = filterLogsByDateRange(testLogs, start, end);

        expect(result).toHaveLength(0);
    });

    it('should include logs on boundary dates', () => {
        const start = new Date('2025-12-20T00:00:00.000Z');
        const end = new Date('2025-12-20T23:59:59.999Z');

        const result = filterLogsByDateRange(testLogs, start, end);

        expect(result).toHaveLength(1);
        expect(result[0].entryTime).toBe('2025-12-20T10:00:00.000Z');
    });

    it('should return all logs when range covers all', () => {
        const start = new Date('2025-12-01T00:00:00.000Z');
        const end = new Date('2025-12-31T23:59:59.999Z');

        const result = filterLogsByDateRange(testLogs, start, end);

        expect(result).toHaveLength(4);
    });

    it('should handle empty logs array', () => {
        const start = new Date('2025-12-01T00:00:00.000Z');
        const end = new Date('2025-12-31T23:59:59.999Z');

        const result = filterLogsByDateRange([], start, end);

        expect(result).toHaveLength(0);
    });

    it('should include logs with null exitTime', () => {
        const logsWithNull = [
            createLog('2025-12-25T10:00:00.000Z', null),
            createLog('2025-12-25T14:00:00.000Z', '2025-12-25T18:00:00.000Z'),
        ];
        const start = new Date('2025-12-25T00:00:00.000Z');
        const end = new Date('2025-12-25T23:59:59.999Z');

        const result = filterLogsByDateRange(logsWithNull, start, end);

        expect(result).toHaveLength(2);
    });
});

describe('toJstString', () => {
    it('should convert UTC date to JST toString format', () => {
        // 2026-01-08 13:00:00 UTC = 2026-01-08 22:00:00 JST
        const utcDate = new Date('2026-01-08T13:00:00.000Z');
        const result = toJstString(utcDate);
        expect(result).toBe('Thu Jan 08 2026 22:00:00 GMT+0900 (GMT+09:00)');
    });

    it('should handle dates crossing midnight JST', () => {
        // 2026-01-08 16:30:00 UTC = 2026-01-09 01:30:00 JST
        const utcDate = new Date('2026-01-08T16:30:00.000Z');
        const result = toJstString(utcDate);
        expect(result).toBe('Fri Jan 09 2026 01:30:00 GMT+0900 (GMT+09:00)');
    });

    it('should handle single-digit day correctly', () => {
        // 2026-01-05 10:00:00 UTC = 2026-01-05 19:00:00 JST
        const utcDate = new Date('2026-01-05T10:00:00.000Z');
        const result = toJstString(utcDate);
        expect(result).toBe('Mon Jan 05 2026 19:00:00 GMT+0900 (GMT+09:00)');
    });

    it('should handle December correctly', () => {
        // 2025-12-31 14:00:00 UTC = 2025-12-31 23:00:00 JST
        const utcDate = new Date('2025-12-31T14:00:00.000Z');
        const result = toJstString(utcDate);
        expect(result).toBe('Wed Dec 31 2025 23:00:00 GMT+0900 (GMT+09:00)');
    });

    it('should handle year boundary correctly', () => {
        // 2025-12-31 15:30:00 UTC = 2026-01-01 00:30:00 JST
        const utcDate = new Date('2025-12-31T15:30:00.000Z');
        const result = toJstString(utcDate);
        expect(result).toBe('Thu Jan 01 2026 00:30:00 GMT+0900 (GMT+09:00)');
    });
});

/**
 * 週間ユーティリティのテスト
 * 固定週間方式（月曜〜日曜）のための関数群
 */
import {
    getWeekStartJst,
    getWeekEndJst,
    getLastWeekJst,
    getWeekBeforeLastJst,
    formatWeekPeriod,
} from '../dateUtils';

describe('getWeekStartJst', () => {
    it('should return Monday 00:00:00 for a Wednesday', () => {
        // 2026-01-21 (水) JST → 2026-01-19 (月) 00:00:00 JST
        const wednesday = new Date('2026-01-21T06:00:00.000Z'); // 15:00 JST
        const result = getWeekStartJst(wednesday);

        expect(result.getDay()).toBe(1); // Monday
        expect(result.getDate()).toBe(19);
        expect(result.getHours()).toBe(0);
        expect(result.getMinutes()).toBe(0);
        expect(result.getSeconds()).toBe(0);
    });

    it('should return same Monday for a Monday', () => {
        // 2026-01-19 (月) JST → 2026-01-19 (月) 00:00:00 JST
        const monday = new Date('2026-01-19T01:00:00.000Z'); // 10:00 JST
        const result = getWeekStartJst(monday);

        expect(result.getDay()).toBe(1); // Monday
        expect(result.getDate()).toBe(19);
    });

    it('should return previous Monday for a Sunday (week ends on Sunday)', () => {
        // 2026-01-25 (日) JST → 2026-01-19 (月) 00:00:00 JST (same week)
        const sunday = new Date('2026-01-25T03:00:00.000Z'); // 12:00 JST
        const result = getWeekStartJst(sunday);

        expect(result.getDay()).toBe(1); // Monday
        expect(result.getDate()).toBe(19); // 1/19 is the Monday of that week
    });

    it('should handle Saturday correctly', () => {
        // 2026-01-24 (土) JST → 2026-01-19 (月) 00:00:00 JST
        const saturday = new Date('2026-01-24T05:00:00.000Z'); // 14:00 JST
        const result = getWeekStartJst(saturday);

        expect(result.getDay()).toBe(1); // Monday
        expect(result.getDate()).toBe(19);
    });

    it('should handle year boundary (week spanning year end)', () => {
        // 2026-01-01 (木) JST → 2025-12-29 (月) 00:00:00 JST
        const newYearsDay = new Date('2025-12-31T15:00:00.000Z'); // 2026-01-01 00:00 JST
        const result = getWeekStartJst(newYearsDay);

        expect(result.getDay()).toBe(1); // Monday
        expect(result.getFullYear()).toBe(2025);
        expect(result.getMonth()).toBe(11); // December
        expect(result.getDate()).toBe(29);
    });
});

describe('getWeekEndJst', () => {
    it('should return Sunday 23:59:59 for a Wednesday', () => {
        // 2026-01-21 (水) JST → 2026-01-25 (日) 23:59:59 JST
        const wednesday = new Date('2026-01-21T06:00:00.000Z'); // 15:00 JST
        const result = getWeekEndJst(wednesday);

        expect(result.getDay()).toBe(0); // Sunday
        expect(result.getDate()).toBe(25);
        expect(result.getHours()).toBe(23);
        expect(result.getMinutes()).toBe(59);
        expect(result.getSeconds()).toBe(59);
    });

    it('should return same Sunday for a Sunday', () => {
        // 2026-01-25 (日) JST → 2026-01-25 (日) 23:59:59 JST
        const sunday = new Date('2026-01-25T03:00:00.000Z'); // 12:00 JST
        const result = getWeekEndJst(sunday);

        expect(result.getDay()).toBe(0); // Sunday
        expect(result.getDate()).toBe(25);
    });

    it('should return following Sunday for a Monday', () => {
        // 2026-01-19 (月) JST → 2026-01-25 (日) 23:59:59 JST
        const monday = new Date('2026-01-19T01:00:00.000Z'); // 10:00 JST
        const result = getWeekEndJst(monday);

        expect(result.getDay()).toBe(0); // Sunday
        expect(result.getDate()).toBe(25);
    });
});

describe('getLastWeekJst', () => {
    it('should return previous week Monday to Sunday', () => {
        // 2026-01-20 (月) から見た先週 = 2026-01-12 (月) 〜 2026-01-18 (日)
        const monday = new Date('2026-01-20T01:00:00.000Z'); // 10:00 JST
        const { start, end } = getLastWeekJst(monday);

        // Start: 2026-01-12 (月) 00:00:00 JST
        expect(start.getDay()).toBe(1); // Monday
        expect(start.getDate()).toBe(12);
        expect(start.getMonth()).toBe(0); // January
        expect(start.getHours()).toBe(0);

        // End: 2026-01-18 (日) 23:59:59 JST
        expect(end.getDay()).toBe(0); // Sunday
        expect(end.getDate()).toBe(18);
        expect(end.getHours()).toBe(23);
        expect(end.getMinutes()).toBe(59);
    });

    it('should return same last week throughout the current week', () => {
        // 月曜から日曜まで、同じ「先週」を返す
        const mondayResult = getLastWeekJst(new Date('2026-01-19T01:00:00.000Z')); // 月
        const wednesdayResult = getLastWeekJst(new Date('2026-01-21T06:00:00.000Z')); // 水
        const sundayResult = getLastWeekJst(new Date('2026-01-25T03:00:00.000Z')); // 日

        expect(mondayResult.start.getDate()).toBe(12);
        expect(wednesdayResult.start.getDate()).toBe(12);
        expect(sundayResult.start.getDate()).toBe(12);
    });

    it('should handle year boundary correctly', () => {
        // 2026-01-05 (月) から見た先週 = 2025-12-29 (月) 〜 2026-01-04 (日)
        const monday = new Date('2026-01-05T01:00:00.000Z'); // 10:00 JST
        const { start, end } = getLastWeekJst(monday);

        expect(start.getFullYear()).toBe(2025);
        expect(start.getMonth()).toBe(11); // December
        expect(start.getDate()).toBe(29);

        expect(end.getFullYear()).toBe(2026);
        expect(end.getMonth()).toBe(0); // January
        expect(end.getDate()).toBe(4);
    });
});

describe('getWeekBeforeLastJst', () => {
    it('should return week before last Monday to Sunday', () => {
        // 2026-01-20 (月) から見た先々週 = 2026-01-05 (月) 〜 2026-01-11 (日)
        const monday = new Date('2026-01-20T01:00:00.000Z'); // 10:00 JST
        const { start, end } = getWeekBeforeLastJst(monday);

        // Start: 2026-01-05 (月) 00:00:00 JST
        expect(start.getDay()).toBe(1); // Monday
        expect(start.getDate()).toBe(5);
        expect(start.getMonth()).toBe(0); // January

        // End: 2026-01-11 (日) 23:59:59 JST
        expect(end.getDay()).toBe(0); // Sunday
        expect(end.getDate()).toBe(11);
    });

    it('should handle year boundary correctly', () => {
        // 2026-01-05 (月) から見た先々週 = 2025-12-22 (月) 〜 2025-12-28 (日)
        const monday = new Date('2026-01-05T01:00:00.000Z'); // 10:00 JST
        const { start, end } = getWeekBeforeLastJst(monday);

        expect(start.getFullYear()).toBe(2025);
        expect(start.getMonth()).toBe(11); // December
        expect(start.getDate()).toBe(22);

        expect(end.getFullYear()).toBe(2025);
        expect(end.getMonth()).toBe(11); // December
        expect(end.getDate()).toBe(28);
    });
});

describe('formatWeekPeriod', () => {
    it('should format week period as "M/D(曜) - M/D(曜)"', () => {
        const start = new Date('2026-01-12T00:00:00'); // Monday
        const end = new Date('2026-01-18T23:59:59'); // Sunday

        const result = formatWeekPeriod(start, end);

        expect(result).toBe('1/12(月) - 1/18(日)');
    });

    it('should handle year boundary', () => {
        const start = new Date('2025-12-29T00:00:00'); // Monday
        const end = new Date('2026-01-04T23:59:59'); // Sunday

        const result = formatWeekPeriod(start, end);

        expect(result).toBe('12/29(月) - 1/4(日)');
    });

    it('should use Japanese day names', () => {
        const start = new Date('2026-01-05T00:00:00'); // Monday
        const end = new Date('2026-01-11T23:59:59'); // Sunday

        const result = formatWeekPeriod(start, end);

        expect(result).toContain('月'); // Monday in Japanese
        expect(result).toContain('日'); // Sunday in Japanese
    });
});
