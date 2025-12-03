import React from 'react';
import Link from 'next/link';

interface ButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    href?: string;
    type?: 'button' | 'submit' | 'reset';
    variant?: 'primary' | 'meeting' | 'rest' | 'gradient-teal';
    className?: string;
    disabled?: boolean;
    style?: React.CSSProperties;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    onClick,
    href,
    type = 'button',
    variant = 'primary',
    className = '',
    disabled = false,
    style,
}) => {
    const baseClass = 'btn-base';
    const variantClass = `btn-${variant}`;
    const combinedClass = `${baseClass} ${variantClass} ${className}`;

    if (href) {
        return (
            <Link href={href} className={combinedClass} style={style}>
                {children}
            </Link>
        );
    }

    return (
        <button
            type={type}
            onClick={onClick}
            className={combinedClass}
            disabled={disabled}
            style={style}
        >
            {children}
        </button>
    );
};
