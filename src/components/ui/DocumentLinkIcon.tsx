/**
 * ドキュメントリンクアイコンコンポーネント
 *
 * Google Docs/Sheets へのクイックアクセスリンクを提供。
 * ランキングウィジェットなどで生徒のドキュメントへの
 * ワンクリックアクセスを実現する。
 */

import { FileText, Table } from 'lucide-react';
import { MouseEvent } from 'react';

export interface DocumentLinkIconProps {
    /** リンク先URL */
    href: string;
    /** ドキュメントタイプ */
    type: 'doc' | 'sheet';
    /** アイコンサイズ（デフォルト: 14） */
    size?: number;
    /** 追加のクラス名 */
    className?: string;
}

/** タイプごとの設定 */
const CONFIG = {
    doc: {
        Icon: FileText,
        label: 'Google Docs',
        hoverColor: '#4285f4', // Google Blue
    },
    sheet: {
        Icon: Table,
        label: 'Google Sheets',
        hoverColor: '#34a853', // Google Green
    },
} as const;

/**
 * ドキュメントリンクアイコン
 *
 * @example
 * ```tsx
 * {student.docLink && <DocumentLinkIcon href={student.docLink} type="doc" />}
 * {student.sheetLink && <DocumentLinkIcon href={student.sheetLink} type="sheet" />}
 * ```
 */
export const DocumentLinkIcon = ({
    href,
    type,
    size = 14,
    className = '',
}: DocumentLinkIconProps) => {
    // 空のhrefの場合は何も表示しない
    if (!href) return null;

    const config = CONFIG[type];
    const { Icon, label, hoverColor } = config;

    const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
        // 親要素のクリックイベント（行展開など）を防止
        e.stopPropagation();
    };

    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            aria-label={label}
            title={label}
            className={className}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
                color: 'var(--text-sub, #64748b)',
                cursor: 'pointer',
                transition: 'color 0.2s ease',
                textDecoration: 'none',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.color = hoverColor;
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-sub, #64748b)';
            }}
        >
            <Icon size={size} />
        </a>
    );
};
