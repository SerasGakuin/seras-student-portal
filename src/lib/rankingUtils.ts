/**
 * Ranking utilities with proper tie handling (Olympic-style ranking)
 *
 * Olympic-style ranking: When items have the same value, they share the same rank.
 * The next rank is skipped based on the number of tied items.
 * Example: [100, 100, 80] → ranks: [1, 1, 3]
 */

export interface RankableItem<T> {
    item: T;
    value: number;
}

export interface RankedItem<T> extends RankableItem<T> {
    rank: number;
}

/**
 * Calculate ranks with proper tie handling (Olympic-style ranking).
 * Items with the same value receive the same rank, and the next rank is skipped.
 *
 * @param items - Array of items with values to rank
 * @param descending - If true (default), higher values get lower ranks (1st, 2nd, etc.)
 * @returns Sorted array with rank assigned to each item
 *
 * @example
 * // [100, 100, 80] → [{ rank: 1 }, { rank: 1 }, { rank: 3 }]
 * calculateRanksWithTies([
 *   { item: 'A', value: 100 },
 *   { item: 'B', value: 100 },
 *   { item: 'C', value: 80 }
 * ]);
 */
export function calculateRanksWithTies<T>(
    items: RankableItem<T>[],
    descending: boolean = true
): RankedItem<T>[] {
    if (items.length === 0) {
        return [];
    }

    // Sort items by value
    const sorted = [...items].sort((a, b) => {
        return descending ? b.value - a.value : a.value - b.value;
    });

    // Assign ranks with tie handling
    const result: RankedItem<T>[] = [];
    let currentRank = 1;

    for (let i = 0; i < sorted.length; i++) {
        const current = sorted[i];

        if (i > 0 && current.value !== sorted[i - 1].value) {
            // Value changed, update rank to current position + 1
            currentRank = i + 1;
        }

        result.push({
            ...current,
            rank: currentRank,
        });
    }

    return result;
}

/**
 * Get top N items with proper tie handling.
 * If there are ties at rank N, all tied items are included.
 *
 * @param items - Array of items with values to rank
 * @param n - Maximum rank to include (e.g., 3 for top 3)
 * @param minThreshold - Optional minimum value threshold; items below this are excluded
 * @returns Array of top N ranked items (may contain more than N if there are ties)
 *
 * @example
 * // When 2 items tie at rank 3, all 4 items are returned
 * getTopNWithTies([
 *   { item: 'A', value: 100 },
 *   { item: 'B', value: 80 },
 *   { item: 'C', value: 60 },
 *   { item: 'D', value: 60 }
 * ], 3); // Returns all 4 items
 */
export function getTopNWithTies<T>(
    items: RankableItem<T>[],
    n: number,
    minThreshold?: number
): RankedItem<T>[] {
    if (items.length === 0) {
        return [];
    }

    // Filter by threshold if provided
    const filtered = minThreshold !== undefined
        ? items.filter(item => item.value >= minThreshold)
        : items;

    if (filtered.length === 0) {
        return [];
    }

    // Calculate ranks
    const ranked = calculateRanksWithTies(filtered);

    // Include all items with rank <= n
    return ranked.filter(item => item.rank <= n);
}
