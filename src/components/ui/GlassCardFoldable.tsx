"use client";

import React, { useState } from "react";
import styles from "./GlassCardFoldable.module.css";

/**
 * GlassCardFoldable のプロパティ定義
 */
interface GlassCardFoldableProps extends React.HTMLAttributes<HTMLDivElement> {
  /** カード内に表示するメインコンテンツ（10万件のリストなど） */
  children: React.ReactNode;
  /** ヘッダー中央に表示するタイトル（必須） */
  title: string;
  /** タイトルの右横に表示する数値やラベル（例: 検索ヒット件数） */
  badge?: string | number;
  /** 初期表示時に展開(true)するか、折りたたむ(false)か */
  defaultExpanded?: boolean;
}

/**
 * 【汎用UI】折りたたみ機能付きガラススタイルカード
 * * @description
 * 既存の GlassCard のデザイン変数を継承しつつ、開閉ロジックを追加した特化型コンポーネント。
 * 非表示（isExpanded=false）時には children を DOM から物理的に除外することで、
 * 大規模データの保持に伴うブラウザのメモリ・再描画負荷を低減します。
 */
export const GlassCardFoldable = ({
  children,
  className = "",
  title,
  badge,
  defaultExpanded = true,
  ...props
}: GlassCardFoldableProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div
      className={`${styles.card} ${className}`}
      {...props}
      style={{
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        ...props.style,
      }}
    >
      <header
        className={styles.header}
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        aria-expanded={isExpanded}
        tabIndex={0} // キーボード操作用
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <div className={styles.titleGroup}>
          <h3 className={styles.titleText}>{title}</h3>
          {badge !== undefined && <span className={styles.badge}>{badge}</span>}
        </div>
        <span className={`${styles.arrow} ${isExpanded ? styles.rotated : ""}`}>
          ▼
        </span>
      </header>

      {/* 開閉状態の条件付きレンダリング：
          display: none ではなく物理削除することで、10万件のDOM負荷をゼロにする。 */}
      {isExpanded && <div className={styles.content}>{children}</div>}
    </div>
  );
};
