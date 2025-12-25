import CSS from 'csstype';

interface SkeletonProps {
    width?: string;
    height?: string;
    borderRadius?: string;
    style?: CSS.Properties;
}

export const Skeleton = ({ width = '100%', height = '20px', borderRadius = '4px', style }: SkeletonProps) => {
    return (
        <div
            style={{
                width,
                height,
                borderRadius,
                background: 'linear-gradient(90deg, #f0f0f0 25%, #f8f8f8 50%, #f0f0f0 75%)',
                backgroundSize: '200% 100%',
                animation: 'skeleton-loading 1.5s infinite',
                ...style
            }}
        >
            <style jsx>{`
                @keyframes skeleton-loading {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `}</style>
        </div>
    );
};
