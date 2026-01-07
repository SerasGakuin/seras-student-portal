/**
 * バッジ・週間ランキング関連の型定義
 */

/**
 * バッジの種類
 */
export type BadgeType =
    | 'HEAVY_USER'    // トップランカー
    | 'EARLY_BIRD'    // 早起きマスター (4:00-9:00)
    | 'NIGHT_OWL'     // 深夜マスター (20:00-24:00)
    | 'CONSISTENT'    // 皆勤賞候補
    | 'MARATHON'      // 長時間マスター
    | 'RISING_STAR';  // 急上昇

/**
 * バッジ情報
 */
export interface Badge {
    type: BadgeType;
    rank: number;       // 1, 2, 3
    value?: number | string;  // 例: "15h", "5 times"
}

/**
 * 生徒名 → バッジ配列のマップ
 */
export type StudentBadgesMap = Record<string, Badge[]>;

/**
 * 生徒名 → ランク（1-indexed）のマップ
 */
export type StudentRankingsMap = Record<string, number>;

/**
 * 統合週間バッジデータ（受験生/非受験生別）
 */
export interface UnifiedWeeklyBadges {
    exam: StudentBadgesMap;
    general: StudentBadgesMap;
    totalExamStudents: number;
    totalGeneralStudents: number;
    examRankings: StudentRankingsMap;
    generalRankings: StudentRankingsMap;
}
