'use client';

import { useRef, useState, ReactNode } from 'react';
import { toPng } from 'html-to-image';
import { Download } from 'lucide-react';

interface ChartContainerProps {
  title: string;
  children: ReactNode;
}

export function ChartContainer({ title, children }: ChartContainerProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!chartRef.current || downloading) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(chartRef.current, { backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `${title}_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('PNG export failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  // Use CSS module styles inline for now, or create a simple inline styled component
  // Style: GlassCard-like container with title header and download button
  return (
    <div style={{
      background: 'var(--card-bg)',
      borderRadius: 'var(--card-border-radius)',
      padding: 'var(--card-padding)',
      boxShadow: 'var(--shadow-card)',
      marginBottom: 'var(--spacing-lg)',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--spacing-md)',
      }}>
        <h3 style={{
          fontSize: '1.05rem',
          fontWeight: 700,
          color: 'var(--text-main)',
          margin: 0,
        }}>
          {title}
        </h3>
        <button
          onClick={handleDownload}
          disabled={downloading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--text-sub)',
            background: 'rgba(0,0,0,0.04)',
            border: 'none',
            borderRadius: '10px',
            cursor: downloading ? 'wait' : 'pointer',
            transition: 'var(--transition-normal)',
            opacity: downloading ? 0.5 : 1,
          }}
        >
          <Download size={14} />
          {downloading ? '保存中...' : 'PNG保存'}
        </button>
      </div>
      <div ref={chartRef}>
        {children}
      </div>
    </div>
  );
}
