/**
 * バッジ設定の共通定義
 *
 * 週間ランキングで使用されるバッジの設定を一元管理。
 * コンポーネント間での重複定義を排除。
 */

import { Crown, Sunrise, Moon, CalendarDays, Timer, Zap } from 'lucide-react';
import type { BadgeType } from '@/types/badge';

export interface BadgeConfig {
    label: string;
    icon: (size: number) => React.ReactNode;
    desc: string;
}

/**
 * バッジ設定
 *
 * 各バッジタイプに対応するラベル、アイコン、説明を定義。
 * iconは関数として定義し、使用時にサイズを指定できる。
 */
export const BADGE_CONFIG: Record<BadgeType, BadgeConfig> = {
    HEAVY_USER: {
        label: 'トップランカー',
        icon: (size: number) => <Crown size={size} />,
        desc: '勉強時間の合計がトップクラス',
    },
    EARLY_BIRD: {
        label: '早起きマスター',
        icon: (size: number) => <Sunrise size={size} />,
        desc: '朝イチから来て勉強している',
    },
    NIGHT_OWL: {
        label: '深夜マスター',
        icon: (size: number) => <Moon size={size} />,
        desc: '閉館ギリギリまで残って勉強している',
    },
    CONSISTENT: {
        label: '皆勤賞候補',
        icon: (size: number) => <CalendarDays size={size} />,
        desc: 'ほぼ毎日、塾に来ている',
    },
    MARATHON: {
        label: '長時間マスター',
        icon: (size: number) => <Timer size={size} />,
        desc: '1回の滞在時間が長い',
    },
    RISING_STAR: {
        label: '急上昇',
        icon: (size: number) => <Zap size={size} />,
        desc: '前の週より勉強時間が大幅にアップ',
    },
};
