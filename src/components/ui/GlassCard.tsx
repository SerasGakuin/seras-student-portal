import React from "react";

import styles from "./GlassCard.module.css";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const GlassCard = ({
  children,
  className = "",
  ...props
}: GlassCardProps) => {
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
      {children}
    </div>
  );
};
