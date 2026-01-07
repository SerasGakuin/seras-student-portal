/**
 * キャッシュ設定の一元管理
 * Next.js unstable_cache の設定値を統一
 */

/**
 * キャッシュ設定
 * revalidate: キャッシュ有効期限（秒）
 * tags: キャッシュ無効化用タグ
 */
export const CACHE_CONFIG = {
    /**
     * 混雑状況データ (occupancyService)
     * 短い有効期限でリアルタイム性を確保
     */
    OCCUPANCY_STATUS: {
        keys: ['occupancy-combined-data-v3'],
        revalidate: 10,
        tags: ['occupancy-raw-sheet'],
    },

    /**
     * 生徒マスターデータ (GoogleSheetStudentRepository)
     * 変更頻度が低いため中程度の有効期限
     */
    STUDENT_MASTER: {
        keys: ['student-master-all'],
        revalidate: 30,
        tags: ['student-data'],
    },

    /**
     * 入退室ログ (GoogleSheetOccupancyRepository)
     * 履歴データのため長めの有効期限
     */
    OCCUPANCY_LOGS: {
        keys: ['occupancy-logs-all'],
        revalidate: 3600, // 1時間
        tags: ['occupancy-logs'],
    },
} as const;

/**
 * キャッシュタグ定数
 * revalidateTag() で使用
 */
export const CACHE_TAGS = {
    OCCUPANCY: 'occupancy-raw-sheet',
    STUDENT: 'student-data',
    OCCUPANCY_LOGS: 'occupancy-logs',
} as const;
