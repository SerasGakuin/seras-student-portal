/**
 * formatUtils ユーティリティのテスト
 * 分→時間表示の変換関数群
 */

import { splitMinutes, formatMinutesHm, formatMinutesHoursOnly } from '../formatUtils';

describe('splitMinutes', () => {
    it('should split 150 minutes into 2h 30m', () => {
        expect(splitMinutes(150)).toEqual({ hours: 2, mins: 30 });
    });

    it('should handle exact hours (120 minutes)', () => {
        expect(splitMinutes(120)).toEqual({ hours: 2, mins: 0 });
    });

    it('should handle zero minutes', () => {
        expect(splitMinutes(0)).toEqual({ hours: 0, mins: 0 });
    });

    it('should handle large values (3150 minutes = 52h 30m)', () => {
        expect(splitMinutes(3150)).toEqual({ hours: 52, mins: 30 });
    });

    it('should handle minutes less than 60', () => {
        expect(splitMinutes(45)).toEqual({ hours: 0, mins: 45 });
    });

    it('should handle 1 minute', () => {
        expect(splitMinutes(1)).toEqual({ hours: 0, mins: 1 });
    });

    it('should handle 59 minutes', () => {
        expect(splitMinutes(59)).toEqual({ hours: 0, mins: 59 });
    });

    it('should handle 60 minutes', () => {
        expect(splitMinutes(60)).toEqual({ hours: 1, mins: 0 });
    });
});

describe('formatMinutesHm', () => {
    it('should format 150 minutes as "2h 30m"', () => {
        expect(formatMinutesHm(150)).toBe('2h 30m');
    });

    it('should format exact hours as "2h 0m"', () => {
        expect(formatMinutesHm(120)).toBe('2h 0m');
    });

    it('should format zero as "0h 0m"', () => {
        expect(formatMinutesHm(0)).toBe('0h 0m');
    });

    it('should format large values correctly', () => {
        expect(formatMinutesHm(3150)).toBe('52h 30m');
    });

    it('should format sub-hour values', () => {
        expect(formatMinutesHm(45)).toBe('0h 45m');
    });
});

describe('formatMinutesHoursOnly', () => {
    it('should format 150 minutes as "2h"', () => {
        expect(formatMinutesHoursOnly(150)).toBe('2h');
    });

    it('should format exact hours', () => {
        expect(formatMinutesHoursOnly(120)).toBe('2h');
    });

    it('should format zero as "0h"', () => {
        expect(formatMinutesHoursOnly(0)).toBe('0h');
    });

    it('should truncate (not round) minutes', () => {
        // 179 minutes = 2h 59m → "2h" (not "3h")
        expect(formatMinutesHoursOnly(179)).toBe('2h');
    });

    it('should format large values', () => {
        expect(formatMinutesHoursOnly(3150)).toBe('52h');
    });
});
