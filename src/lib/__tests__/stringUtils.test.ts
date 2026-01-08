/**
 * stringUtils ユーティリティのテスト
 * Phase 1: normalizeName のテスト
 */

import { normalizeName } from '../stringUtils';

describe('normalizeName', () => {
    it('should trim leading and trailing whitespace', () => {
        expect(normalizeName('  田中太郎  ')).toBe('田中太郎');
        expect(normalizeName('\t佐藤花子\t')).toBe('佐藤花子');
        expect(normalizeName('\n山田一郎\n')).toBe('山田一郎');
    });

    it('should remove internal whitespace', () => {
        expect(normalizeName('田中 太郎')).toBe('田中太郎');
        expect(normalizeName('佐藤  花子')).toBe('佐藤花子');
        expect(normalizeName('山 田 一 郎')).toBe('山田一郎');
    });

    it('should remove zero-width characters', () => {
        // Zero-width space (U+200B)
        expect(normalizeName('田中\u200B太郎')).toBe('田中太郎');

        // Zero-width non-joiner (U+200C)
        expect(normalizeName('田中\u200C太郎')).toBe('田中太郎');

        // Zero-width joiner (U+200D)
        expect(normalizeName('田中\u200D太郎')).toBe('田中太郎');

        // Zero-width no-break space / BOM (U+FEFF)
        expect(normalizeName('田中\uFEFF太郎')).toBe('田中太郎');
    });

    it('should handle mixed whitespace and zero-width characters', () => {
        expect(normalizeName('  田中\u200B 太郎  ')).toBe('田中太郎');
        expect(normalizeName('\uFEFF佐藤 \u200D花子\t')).toBe('佐藤花子');
    });

    it('should handle empty string', () => {
        expect(normalizeName('')).toBe('');
    });

    it('should handle string with only whitespace', () => {
        expect(normalizeName('   ')).toBe('');
        expect(normalizeName('\t\n\r')).toBe('');
    });

    it('should handle string with only zero-width characters', () => {
        expect(normalizeName('\u200B\u200C\u200D\uFEFF')).toBe('');
    });

    it('should not modify already normalized names', () => {
        expect(normalizeName('田中太郎')).toBe('田中太郎');
        expect(normalizeName('JohnDoe')).toBe('JohnDoe');
    });

    it('should handle full-width spaces', () => {
        // Full-width space (U+3000)
        expect(normalizeName('田中\u3000太郎')).toBe('田中太郎');
    });

    it('should handle names with numbers', () => {
        expect(normalizeName(' 田中 太郎 1 ')).toBe('田中太郎1');
    });
});
