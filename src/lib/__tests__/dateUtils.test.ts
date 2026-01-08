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
