// components/ui/GlassCardFoldable.tsx
"use client";

import React, { useState } from "react";
import styles from "./GlassCardFoldable.module.css";

interface GlassCardFoldableProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  title: string;
  badge?: string | number;
  defaultExpanded?: boolean;
}

export const GlassCardFoldable = ({
  children,
  className = "",
  title,
  badge,
  defaultExpanded = true,
  ...props
}: GlassCardFoldableProps) => {
  // 開閉状態を管理する内部ステート
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div
      className={`${styles.card} ${className}`}
      {...props}
      style={{
        // インラインでの背景効果設定（既存の GlassCard との整合性維持）
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        ...props.style,
      }}
    >
      {/* クリックで開閉可能なヘッダーエリア */}
      <header
        className={styles.header}
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        aria-expanded={isExpanded}
      >
        <div className={styles.titleGroup}>
          <h3 className={styles.titleText}>{title}</h3>
          {/* バッジが指定されている場合のみ表示 */}
          {badge !== undefined && <span className={styles.badge}>{badge}</span>}
        </div>
        {/* 開閉状態に応じて回転する矢印アイコン */}
        <span className={`${styles.arrow} ${isExpanded ? styles.rotated : ""}`}>
          ▼
        </span>
      </header>

      {/* パフォーマンス最適化の核：
        isExpanded が false の場合、children を含めた content 領域を DOM から物理的に削除します。
        これにより、非表示時のブラウザのメモリ負荷と描画コストを最小限に抑えます。
      */}
      {isExpanded && <div className={styles.content}>{children}</div>}
    </div>
  );
};
