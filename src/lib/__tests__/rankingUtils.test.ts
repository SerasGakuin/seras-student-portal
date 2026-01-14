import {
    calculateRanksWithTies,
    getTopNWithTies,
    RankableItem,
} from '../rankingUtils';

describe('rankingUtils', () => {
    describe('calculateRanksWithTies', () => {
        it('should assign sequential ranks when no ties: [100, 80, 60] → [1, 2, 3]', () => {
            const items: RankableItem<string>[] = [
                { item: 'A', value: 100 },
                { item: 'B', value: 80 },
                { item: 'C', value: 60 },
            ];

            const result = calculateRanksWithTies(items);

            expect(result).toHaveLength(3);
            expect(result[0]).toEqual({ item: 'A', value: 100, rank: 1 });
            expect(result[1]).toEqual({ item: 'B', value: 80, rank: 2 });
            expect(result[2]).toEqual({ item: 'C', value: 60, rank: 3 });
        });

        it('should assign same rank for ties: [100, 100, 60] → [1, 1, 3]', () => {
            const items: RankableItem<string>[] = [
                { item: 'A', value: 100 },
                { item: 'B', value: 100 },
                { item: 'C', value: 60 },
            ];

            const result = calculateRanksWithTies(items);

            expect(result).toHaveLength(3);
            expect(result[0]).toEqual({ item: 'A', value: 100, rank: 1 });
            expect(result[1]).toEqual({ item: 'B', value: 100, rank: 1 });
            expect(result[2]).toEqual({ item: 'C', value: 60, rank: 3 });
        });

        it('should assign rank 1 to all when all tied: [100, 100, 100] → [1, 1, 1]', () => {
            const items: RankableItem<string>[] = [
                { item: 'A', value: 100 },
                { item: 'B', value: 100 },
                { item: 'C', value: 100 },
            ];

            const result = calculateRanksWithTies(items);

            expect(result).toHaveLength(3);
            expect(result.every(r => r.rank === 1)).toBe(true);
        });

        it('should handle multiple tie groups: [100, 100, 80, 80, 60] → [1, 1, 3, 3, 5]', () => {
            const items: RankableItem<string>[] = [
                { item: 'A', value: 100 },
                { item: 'B', value: 100 },
                { item: 'C', value: 80 },
                { item: 'D', value: 80 },
                { item: 'E', value: 60 },
            ];

            const result = calculateRanksWithTies(items);

            expect(result).toHaveLength(5);
            expect(result[0].rank).toBe(1);
            expect(result[1].rank).toBe(1);
            expect(result[2].rank).toBe(3);
            expect(result[3].rank).toBe(3);
            expect(result[4].rank).toBe(5);
        });

        it('should return empty array for empty input', () => {
            const result = calculateRanksWithTies([]);
            expect(result).toEqual([]);
        });

        it('should sort items by value in descending order by default', () => {
            const items: RankableItem<string>[] = [
                { item: 'C', value: 60 },
                { item: 'A', value: 100 },
                { item: 'B', value: 80 },
            ];

            const result = calculateRanksWithTies(items);

            expect(result[0].item).toBe('A');
            expect(result[1].item).toBe('B');
            expect(result[2].item).toBe('C');
        });

        it('should sort items in ascending order when descending is false', () => {
            const items: RankableItem<string>[] = [
                { item: 'A', value: 100 },
                { item: 'B', value: 80 },
                { item: 'C', value: 60 },
            ];

            const result = calculateRanksWithTies(items, false);

            expect(result[0]).toEqual({ item: 'C', value: 60, rank: 1 });
            expect(result[1]).toEqual({ item: 'B', value: 80, rank: 2 });
            expect(result[2]).toEqual({ item: 'A', value: 100, rank: 3 });
        });

        it('should handle single item', () => {
            const items: RankableItem<string>[] = [
                { item: 'A', value: 100 },
            ];

            const result = calculateRanksWithTies(items);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({ item: 'A', value: 100, rank: 1 });
        });
    });

    describe('getTopNWithTies', () => {
        it('should return top 3 when no ties', () => {
            const items: RankableItem<string>[] = [
                { item: 'A', value: 100 },
                { item: 'B', value: 80 },
                { item: 'C', value: 60 },
                { item: 'D', value: 40 },
            ];

            const result = getTopNWithTies(items, 3);

            expect(result).toHaveLength(3);
            expect(result.map(r => r.item)).toEqual(['A', 'B', 'C']);
        });

        it('should include all tied at 3rd place: ties at rank 3', () => {
            const items: RankableItem<string>[] = [
                { item: 'A', value: 100 },
                { item: 'B', value: 80 },
                { item: 'C', value: 60 },
                { item: 'D', value: 60 },
                { item: 'E', value: 40 },
            ];

            const result = getTopNWithTies(items, 3);

            expect(result).toHaveLength(4);
            expect(result.map(r => r.item)).toEqual(['A', 'B', 'C', 'D']);
            expect(result[2].rank).toBe(3);
            expect(result[3].rank).toBe(3);
        });

        it('should return all 5 when tied at 1st place', () => {
            const items: RankableItem<string>[] = [
                { item: 'A', value: 100 },
                { item: 'B', value: 100 },
                { item: 'C', value: 100 },
                { item: 'D', value: 100 },
                { item: 'E', value: 100 },
            ];

            const result = getTopNWithTies(items, 3);

            expect(result).toHaveLength(5);
            expect(result.every(r => r.rank === 1)).toBe(true);
        });

        it('should filter out items below minimum threshold', () => {
            const items: RankableItem<string>[] = [
                { item: 'A', value: 100 },
                { item: 'B', value: 80 },
                { item: 'C', value: 30 },
                { item: 'D', value: 20 },
            ];

            const result = getTopNWithTies(items, 3, 50);

            expect(result).toHaveLength(2);
            expect(result.map(r => r.item)).toEqual(['A', 'B']);
        });

        it('should return empty array when no items meet threshold', () => {
            const items: RankableItem<string>[] = [
                { item: 'A', value: 30 },
                { item: 'B', value: 20 },
            ];

            const result = getTopNWithTies(items, 3, 50);

            expect(result).toEqual([]);
        });

        it('should return empty array for empty input', () => {
            const result = getTopNWithTies([], 3);
            expect(result).toEqual([]);
        });

        it('should handle case where total items less than N', () => {
            const items: RankableItem<string>[] = [
                { item: 'A', value: 100 },
                { item: 'B', value: 80 },
            ];

            const result = getTopNWithTies(items, 3);

            expect(result).toHaveLength(2);
        });

        it('should include tied items even when tie spans N boundary', () => {
            // 2人が1位、3人が3位の場合、Top3を取ると5人全員が含まれる
            const items: RankableItem<string>[] = [
                { item: 'A', value: 100 },
                { item: 'B', value: 100 },
                { item: 'C', value: 80 },
                { item: 'D', value: 80 },
                { item: 'E', value: 80 },
                { item: 'F', value: 60 },
            ];

            const result = getTopNWithTies(items, 3);

            expect(result).toHaveLength(5);
            expect(result[0].rank).toBe(1);
            expect(result[1].rank).toBe(1);
            expect(result[2].rank).toBe(3);
            expect(result[3].rank).toBe(3);
            expect(result[4].rank).toBe(3);
        });
    });
});
