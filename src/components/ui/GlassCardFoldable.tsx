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
      >
        <div className={styles.titleGroup}>
          <h3 className={styles.titleText}>{title}</h3>
          {badge !== undefined && <span className={styles.badge}>{badge}</span>}
        </div>
        <span className={`${styles.arrow} ${isExpanded ? styles.rotated : ""}`}>
          ▼
        </span>
      </header>

      {isExpanded && <div className={styles.content}>{children}</div>}
    </div>
  );
};
