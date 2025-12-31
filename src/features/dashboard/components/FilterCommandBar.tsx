import { useState, useRef, useEffect } from 'react';
import { Calendar, Users, ChevronDown, Check, Clock, Globe } from 'lucide-react';
import { DateRangeOption, FilterType } from './DashboardControls';
import styles from './FilterCommandBar.module.css';

interface FilterCommandBarProps {
    currentRange: DateRangeOption;
    currentGrade: FilterType;
    availableMonths: string[];
    onRangeChange: (range: DateRangeOption, from: Date, to: Date) => void;
    onGradeChange: (grade: FilterType) => void;
}

export const FilterCommandBar = ({ currentRange, currentGrade, availableMonths = [], onRangeChange, onGradeChange }: FilterCommandBarProps) => {
    const [isPeriodOpen, setIsPeriodOpen] = useState(false);
    const [isGradeOpen, setIsGradeOpen] = useState(false);
    const [selectedMonthStr, setSelectedMonthStr] = useState<string | null>(null);


    const periodMenuRef = useRef<HTMLDivElement>(null);
    const gradeMenuRef = useRef<HTMLDivElement>(null);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (periodMenuRef.current && !periodMenuRef.current.contains(event.target as Node)) {
                setIsPeriodOpen(false);
            }
            if (gradeMenuRef.current && !gradeMenuRef.current.contains(event.target as Node)) {
                setIsGradeOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    // --- Helpers ---
    const getPeriodLabel = () => {
        if (currentRange === 'month_select') {
            return selectedMonthStr || '期間を選択';
        }
        if (currentRange === 'last_7_days') return '直近7日間';
        if (currentRange === 'last_14_days') return '直近14日間';
        if (currentRange === 'last_30_days') return '直近30日間';
        if (currentRange === 'last_90_days') return '直近90日間';
        if (currentRange === 'last_180_days') return '直近180日間';
        if (currentRange === 'all_time') return '全期間';

        if (currentRange === 'this_month') return '今月';
        if (currentRange === 'last_month') return '先月';

        if (currentRange === 'this_week') return '今週';
        if (currentRange === 'last_week') return '先週';

        return '期間を選択';
    };

    // Date Logic
    const handleDateSelect = (option: DateRangeOption, monthStr?: string) => {
        const now = new Date();
        let from: Date = new Date();
        let to: Date = new Date();

        if (option === 'month_select' && monthStr) {
            setSelectedMonthStr(monthStr);
            const match = monthStr.match(/(\d{4})年(\d{1,2})月/);
            if (match) {
                const year = parseInt(match[1]);
                const month = parseInt(match[2]) - 1;
                from = new Date(year, month, 1);
                to = new Date(year, month + 1, 0, 23, 59, 59, 999);
            }
            onRangeChange('month_select', from, to);
        } else {
            setSelectedMonthStr(null);
            switch (option) {
                case 'last_7_days':
                    to = new Date(now);
                    to.setDate(now.getDate() - 1); // Yesterday
                    to.setHours(23, 59, 59, 999);

                    from = new Date(to);
                    from.setDate(to.getDate() - 6); // 7 days inclusive: Yesterday - 6 days
                    from.setHours(0, 0, 0, 0);
                    break;
                case 'last_14_days':
                    to = new Date(now);
                    to.setDate(now.getDate() - 1);
                    to.setHours(23, 59, 59, 999);

                    from = new Date(to);
                    from.setDate(to.getDate() - 13);
                    from.setHours(0, 0, 0, 0);
                    break;
                case 'last_30_days':
                    to = new Date(now);
                    to.setDate(now.getDate() - 1);
                    to.setHours(23, 59, 59, 999);

                    from = new Date(to);
                    from.setDate(to.getDate() - 29);
                    from.setHours(0, 0, 0, 0);
                    break;
                case 'last_90_days':
                    to = new Date(now);
                    to.setDate(now.getDate() - 1);
                    to.setHours(23, 59, 59, 999);

                    from = new Date(to);
                    from.setDate(to.getDate() - 89);
                    from.setHours(0, 0, 0, 0);
                    break;
                case 'last_180_days':
                    to = new Date(now);
                    to.setDate(now.getDate() - 1);
                    to.setHours(23, 59, 59, 999);

                    from = new Date(to);
                    from.setDate(to.getDate() - 179);
                    from.setHours(0, 0, 0, 0);
                    break;
                case 'all_time':
                    // "Whole period where data exists"
                    // availableMonths is sorted DESC (newest first). Last item is oldest.
                    // availableMonths format: "YYYY年MM月"
                    if (availableMonths && availableMonths.length > 0) {
                        const oldest = availableMonths[availableMonths.length - 1]; // e.g. "2023年04月"
                        const match = oldest.match(/(\d{4})年(\d{1,2})月/);
                        if (match) {
                            const y = parseInt(match[1]);
                            const m = parseInt(match[2]) - 1;
                            from = new Date(y, m, 1);
                        } else {
                            from = new Date(2023, 3, 1); // Fallback
                        }
                    } else {
                        from = new Date(2023, 3, 1); // Fallback
                    }
                    to = new Date();
                    break;
                case 'this_month':
                    from = new Date(now.getFullYear(), now.getMonth(), 1);
                    to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                    break;
                case 'last_month':
                    from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
                    break;
                default:
                    break;
            }
            if (option !== 'custom') {
                onRangeChange(option, from, to);
            }
        }
        setIsPeriodOpen(false);
    };


    return (
        <div className={styles.stickyWrapper}>
            <div className={styles.bar}>
                {/* Left: Period Selector */}
                <div style={{ position: 'relative' }} ref={periodMenuRef}>
                    <button
                        onClick={() => setIsPeriodOpen(!isPeriodOpen)}
                        className={styles.button}
                    >
                        <div className={`${styles.iconBox} ${styles.blueIcon}`}>
                            <Calendar size={20} />
                        </div>
                        <div className={styles.textContainer}>
                            <div className={styles.label}>対象期間</div>
                            <div className={styles.value}>
                                {getPeriodLabel()}
                                <ChevronDown size={14} color="#94a3b8" />
                            </div>
                        </div>
                    </button>

                    {/* Dropdown Menu */}
                    {isPeriodOpen && (
                        <div className={styles.dropdown} style={{ width: '260px' }}>
                            <div style={{ padding: '8px 12px', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>期間プリセット</div>
                            {[
                                { val: 'last_7_days', label: '直近7日間' },
                                { val: 'last_14_days', label: '直近14日間' },
                                { val: 'last_30_days', label: '直近30日間' },
                                { val: 'last_90_days', label: '直近90日間' },
                                { val: 'last_180_days', label: '直近180日間' },
                                { val: 'all_time', label: '全期間' }
                            ].map(opt => {
                                const active = currentRange === opt.val;
                                return (
                                    <div
                                        key={opt.val}
                                        onClick={() => handleDateSelect(opt.val as DateRangeOption)}
                                        style={{
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            background: active ? '#eff6ff' : 'transparent',
                                            color: active ? '#3b82f6' : '#334155',
                                            fontWeight: active ? 600 : 500,
                                            marginBottom: '2px'
                                        }}
                                        onMouseEnter={(e) => !active && (e.currentTarget.style.background = '#f8fafc')}
                                        onMouseLeave={(e) => !active && (e.currentTarget.style.background = 'transparent')}
                                    >
                                        {opt.label}
                                        {active && <Check size={14} />}
                                    </div>
                                )
                            })}

                            <div style={{ height: '1px', background: '#f1f5f9', margin: '8px 4px' }} />

                            <div style={{ padding: '8px 12px', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>月別アーカイブ</div>
                            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                {availableMonths.map(month => (
                                    <div
                                        key={month}
                                        onClick={() => handleDateSelect('month_select', month)}
                                        style={{
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            color: '#334155',
                                            fontWeight: 500,
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <Clock size={14} color="#94a3b8" />
                                        {month}
                                    </div>
                                ))}
                                {availableMonths.length === 0 && <div style={{ padding: '8px', fontSize: '0.8rem', color: '#cbd5e1', textAlign: 'center' }}>履歴なし</div>}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Grade Selector */}
                <div style={{ position: 'relative' }} ref={gradeMenuRef}>
                    <button
                        onClick={() => setIsGradeOpen(!isGradeOpen)}
                        className={styles.button}
                    >
                        <div className={`${styles.iconBox} ${styles.orangeIcon}`}>
                            <Users size={20} />
                        </div>
                        <div className={styles.textContainer}>
                            <div className={styles.label}>対象学年</div>
                            <div className={styles.value}>
                                {currentGrade === 'ALL' ? '全学年' : currentGrade === 'HS' ? '高校生' : currentGrade === 'JHS' ? '中学生' : currentGrade === 'EXAM' ? '受験生' : currentGrade}
                                <ChevronDown size={14} color="#94a3b8" />
                            </div>
                        </div>
                    </button>

                    {/* Dropdown Menu */}
                    {isGradeOpen && (
                        <div className={styles.dropdown} style={{ width: '200px', maxHeight: '400px', overflowY: 'auto' }}>
                            <div
                                onClick={() => { onGradeChange('ALL'); setIsGradeOpen(false); }}
                                style={{
                                    padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                                    background: currentGrade === 'ALL' ? '#fff7ed' : 'transparent',
                                    color: currentGrade === 'ALL' ? '#f97316' : '#334155',
                                    fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px'
                                }}
                            >
                                <Globe size={16} /> 全学年
                            </div>

                            <div style={{ height: '1px', background: '#f1f5f9', margin: '8px 4px' }} />

                            {/* Exam Students - Standard Styling (Removed custom orange/bold) */}
                            <div
                                onClick={() => { onGradeChange('EXAM'); setIsGradeOpen(false); }}
                                style={{
                                    padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                                    background: currentGrade === 'EXAM' ? '#fff7ed' : 'transparent',
                                    color: currentGrade === 'EXAM' ? '#f97316' : '#334155',
                                    fontWeight: currentGrade === 'EXAM' ? 600 : 500,
                                    fontSize: '0.9rem'
                                }}
                            >
                                受験生 (高3・既卒)
                            </div>

                            <div style={{ height: '1px', background: '#f1f5f9', margin: '8px 4px' }} />

                            {['HS:高校生', 'JHS:中学生'].map(opt => {
                                const [val, label] = opt.split(':');
                                const active = currentGrade === val;
                                return (
                                    <div key={val}
                                        onClick={() => { onGradeChange(val as FilterType); setIsGradeOpen(false); }}
                                        style={{
                                            padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                                            background: active ? '#fff7ed' : 'transparent',
                                            color: active ? '#f97316' : '#334155',
                                            fontWeight: active ? 600 : 500,
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        {label}
                                    </div>
                                )
                            })}

                            <div style={{ height: '1px', background: '#f1f5f9', margin: '8px 4px' }} />

                            {['既卒', '高3', '高2', '高1', '中3', '中2', '中1'].map(grade => {
                                const active = currentGrade === grade;
                                return (
                                    <div key={grade}
                                        onClick={() => { onGradeChange(grade as FilterType); setIsGradeOpen(false); }}
                                        style={{
                                            padding: '6px 12px', borderRadius: '6px', cursor: 'pointer',
                                            background: active ? '#fff7ed' : 'transparent',
                                            color: active ? '#f97316' : '#334155',
                                            fontWeight: active ? 600 : 500,
                                            fontSize: '0.85rem'
                                        }}
                                        onMouseEnter={(e) => !active && (e.currentTarget.style.background = '#f8fafc')}
                                        onMouseLeave={(e) => !active && (e.currentTarget.style.background = 'transparent')}
                                    >
                                        {grade}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

