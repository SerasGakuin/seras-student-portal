/**
 * apiHandler ユーティリティのテスト
 * Phase 1: extractErrorMessage, validateCronRequest のテスト
 */

import { NextRequest } from 'next/server';
import { extractErrorMessage, validateCronRequest } from '../apiHandler';

describe('extractErrorMessage', () => {
    it('should extract message from Error object', () => {
        const error = new Error('Test error message');
        expect(extractErrorMessage(error)).toBe('Test error message');
    });

    it('should return "Unknown error" for non-Error objects', () => {
        expect(extractErrorMessage('string error')).toBe('Unknown error');
        expect(extractErrorMessage(null)).toBe('Unknown error');
        expect(extractErrorMessage(undefined)).toBe('Unknown error');
        expect(extractErrorMessage(123)).toBe('Unknown error');
        expect(extractErrorMessage({ message: 'object error' })).toBe('Unknown error');
    });

    it('should handle Error subclasses', () => {
        const typeError = new TypeError('Type error message');
        expect(extractErrorMessage(typeError)).toBe('Type error message');

        const rangeError = new RangeError('Range error message');
        expect(extractErrorMessage(rangeError)).toBe('Range error message');
    });
});

describe('validateCronRequest', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
        jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        process.env = originalEnv;
        jest.restoreAllMocks();
    });

    it('should return true when CRON_SECRET is not set', () => {
        delete process.env.CRON_SECRET;
        const req = new NextRequest('http://localhost/api/cron/test');

        expect(validateCronRequest(req, 'TestCron')).toBe(true);
    });

    it('should return true when authorization header matches CRON_SECRET', () => {
        process.env.CRON_SECRET = 'test-secret';
        const req = new NextRequest('http://localhost/api/cron/test', {
            headers: { authorization: 'Bearer test-secret' },
        });

        expect(validateCronRequest(req, 'TestCron')).toBe(true);
    });

    it('should return false and log warning when authorization header is missing', () => {
        process.env.CRON_SECRET = 'test-secret';
        const req = new NextRequest('http://localhost/api/cron/test');

        expect(validateCronRequest(req, 'TestCron')).toBe(false);
        expect(console.warn).toHaveBeenCalledWith('[TestCron] Unauthorized cron request');
    });

    it('should return false when authorization header does not match', () => {
        process.env.CRON_SECRET = 'test-secret';
        const req = new NextRequest('http://localhost/api/cron/test', {
            headers: { authorization: 'Bearer wrong-secret' },
        });

        expect(validateCronRequest(req, 'TestCron')).toBe(false);
        expect(console.warn).toHaveBeenCalledWith('[TestCron] Unauthorized cron request');
    });

    it('should return false when authorization header format is incorrect', () => {
        process.env.CRON_SECRET = 'test-secret';
        const req = new NextRequest('http://localhost/api/cron/test', {
            headers: { authorization: 'test-secret' }, // Missing "Bearer " prefix
        });

        expect(validateCronRequest(req, 'TestCron')).toBe(false);
    });
});
