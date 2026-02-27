'use client';

import { ReactNode } from 'react';
import { BarChart3, Trophy } from 'lucide-react';

interface AnalysisType {
  id: string;
  name: string;
  description: string;
  icon: ReactNode;
}

const ANALYSIS_TYPES: AnalysisType[] = [
  {
    id: 'occupancy',
    name: '在室状況分析',
    description: '混雑度ヒートマップ・日次トレンド・内訳を可視化',
    icon: <BarChart3 size={24} />,
  },
  {
    id: 'ranking',
    name: '月間学習時間ランキング',
    description: '月間の学習時間ランキングをPDFで出力',
    icon: <Trophy size={24} />,
  },
];

interface AnalysisSelectorProps {
  selected: string;
  onSelect: (id: string) => void;
}

export function AnalysisSelector({ selected, onSelect }: AnalysisSelectorProps) {
  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap', marginBottom: 'var(--spacing-lg)' }}>
      {ANALYSIS_TYPES.map((type) => (
        <button
          key={type.id}
          onClick={() => onSelect(type.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)',
            padding: '14px 20px',
            background: selected === type.id ? 'var(--brand-color)' : 'var(--card-bg)',
            color: selected === type.id ? '#fff' : 'var(--text-main)',
            border: selected === type.id ? 'none' : '1px solid rgba(0,0,0,0.08)',
            borderRadius: '14px',
            cursor: 'pointer',
            transition: 'var(--transition-normal)',
            boxShadow: selected === type.id ? 'var(--shadow-badge)' : 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          <span style={{ opacity: 0.8 }}>{type.icon}</span>
          <div style={{ textAlign: 'left' }}>
            <div>{type.name}</div>
            <div style={{
              fontSize: '0.75rem',
              fontWeight: 400,
              opacity: 0.7,
              marginTop: '2px',
            }}>
              {type.description}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
