import { ChevronDown, Calendar as CalendarIcon, Clock as HistoryIcon } from 'lucide-react';
import { useRef } from 'react';

export type DateRangeOption = 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'last_7_days' | 'last_14_days' | 'last_30_days' | 'last_90_days' | 'last_180_days' | 'all_time' | 'custom' | 'month_select';
export type FilterType = 'ALL' | 'HS' | 'JHS' | 'EXAM' | '高3' | '高2' | '高1' | '中3' | '中2' | '中1' | '既卒';

interface DashboardControlsProps {
    currentRange: DateRangeOption;
    currentGrade: FilterType;
    availableMonths?: string[]; // e.g. ["2025年12月", "2025年11月"]
    onRangeChange: (range: DateRangeOption, from: Date, to: Date) => void;
    onGradeChange: (grade: FilterType) => void;
}

export const DashboardControls = ({ currentRange, currentGrade, availableMonths = [], onRangeChange, onGradeChange }: DashboardControlsProps) => {
    // Refs for date inputs to read values when custom range changes
    const fromInputRef = useRef<HTMLInputElement>(null);
    const toInputRef = useRef<HTMLInputElement>(null);

    const handleDateSelect = (option: DateRangeOption) => {
        const now = new Date();
        let from: Date;
        let to = new Date(now);

        if (option === 'custom') {
            // Do not fire onChange yet, wait for manual input or keep current if valid
            onRangeChange(option, new Date(), new Date());
            return;
        }

        switch (option) {
            case 'this_week':
                const day = now.getDay() || 7;
                if (day !== 1) now.setHours(-24 * (day - 1));
                else now.setHours(0, 0, 0, 0);
                from = new Date(now.setHours(0, 0, 0, 0));
                to = new Date();
                break;
            case 'last_week':
                const lastMon = new Date(now);
                const day2 = lastMon.getDay() || 7;
                lastMon.setDate(lastMon.getDate() - day2 - 6);
                lastMon.setHours(0, 0, 0, 0);
                from = lastMon;

                const lastSun = new Date(from);
                lastSun.setDate(lastSun.getDate() + 6);
                lastSun.setHours(23, 59, 59, 999);
                to = lastSun;
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
                from = new Date();
        }

        onRangeChange(option, from, to);
    };

    const handleCustomDateChange = () => {
        if (fromInputRef.current?.value && toInputRef.current?.value) {
            const from = new Date(fromInputRef.current.value);
            const to = new Date(toInputRef.current.value);
            // Set end of day for 'to' date to include the full day
            to.setHours(23, 59, 59, 999);
            onRangeChange('custom', from, to);
        }
    };

    const handleMonthSelect = (monthStr: string) => {
        // Parse "2025年12月"
        const match = monthStr.match(/(\d{4})年(\d{1,2})月/);
        if (match) {
            const year = parseInt(match[1]);
            const month = parseInt(match[2]) - 1; // 0-indexed
            const from = new Date(year, month, 1);
            const to = new Date(year, month + 1, 0, 23, 59, 59, 999);
            onRangeChange('month_select', from, to);
        }
    };

    const dateOptions: { label: string; value: DateRangeOption }[] = [
        { label: '今週', value: 'this_week' },
        { label: '先週', value: 'last_week' },
        { label: '今月', value: 'this_month' },
        { label: '先月', value: 'last_month' },
        { label: 'カスタム', value: 'custom' },
    ];

    // Grade Groups configuration
    const gradeGroups = [
        // Group 1: All
        [{ label: '全学年', value: 'ALL' as FilterType }],
        // Group 2: Broad Categories
        [
            { label: '高校生', value: 'HS' as FilterType },
            { label: '中学生', value: 'JHS' as FilterType }
        ],
        // Group 3: Specific Grades (ordered by user request: Grads -> H3 -> H2... -> J1)
        [
            { label: '既卒', value: '既卒' as FilterType },
            { label: '高3', value: '高3' as FilterType },
            { label: '高2', value: '高2' as FilterType },
            { label: '高1', value: '高1' as FilterType },
            { label: '中3', value: '中3' as FilterType },
            { label: '中2', value: '中2' as FilterType },
            { label: '中1', value: '中1' as FilterType },
        ]
    ];

    return (
        <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Row 1: Date Range */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {dateOptions.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => handleDateSelect(opt.value)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '20px',
                                border: '1px solid ' + (currentRange === opt.value ? 'var(--brand-color)' : 'rgba(0,0,0,0.1)'),
                                background: currentRange === opt.value ? 'var(--brand-color)' : '#fff',
                                color: currentRange === opt.value ? '#fff' : 'var(--text-sub)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s ease',
                                boxShadow: currentRange === opt.value ? '0 2px 8px rgba(var(--brand-color-rgb), 0.2)' : 'none'
                            }}
                        >
                            {opt.label}
                        </button>
                    ))}

                    {/* Month Picker Dropdown (Smart) */}
                    {availableMonths && availableMonths.length > 0 && (
                        <div style={{ position: 'relative', marginLeft: '8px' }}>
                            <select
                                onChange={(e) => handleMonthSelect(e.target.value)}
                                value={currentRange === 'month_select' ? 'MONTH' : ''} // Reset if not month mode
                                style={{
                                    appearance: 'none',
                                    padding: '8px 32px 8px 16px',
                                    borderRadius: '20px',
                                    border: '1px solid rgba(0,0,0,0.1)',
                                    background: '#fff',
                                    color: 'var(--text-main)',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    outline: 'none'
                                }}
                            >
                                <option value="" disabled hidden>月を選択</option>
                                <option value="MONTH" style={{ display: 'none' }}>選択中</option>
                                {availableMonths.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                            <HistoryIcon size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-sub)' }} />
                        </div>
                    )}
                </div>

                {/* Custom Date Inputs (Visible only when 'custom' is selected) */}
                {currentRange === 'custom' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.1)' }}>
                        <CalendarIcon size={16} color="var(--text-sub)" />
                        <input
                            type="date"
                            ref={fromInputRef}
                            onChange={handleCustomDateChange}
                            style={{ border: 'none', outline: 'none', color: 'var(--text-main)', fontSize: '0.9rem' }}
                        />
                        <span style={{ color: 'var(--text-sub)' }}>→</span>
                        <input
                            type="date"
                            ref={toInputRef}
                            onChange={handleCustomDateChange}
                            style={{ border: 'none', outline: 'none', color: 'var(--text-main)', fontSize: '0.9rem' }}
                        />
                    </div>
                )}
            </div>

            {/* Row 2: Grade Filter with Separators */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-sub)', fontWeight: 600, whiteSpace: 'nowrap', marginRight: '4px' }}>
                    対象学年:
                </span>

                {gradeGroups.map((group, groupIndex) => (
                    <div key={groupIndex} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Separator before group 2 and 3 */}
                        {groupIndex > 0 && (
                            <div style={{ width: '1px', height: '20px', background: 'rgba(0,0,0,0.15)', margin: '0 4px' }} />
                        )}

                        {group.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => onGradeChange(opt.value)}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: currentGrade === opt.value ? 'var(--text-main)' : 'rgba(0,0,0,0.05)',
                                    color: currentGrade === opt.value ? '#fff' : 'var(--text-sub)',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    whiteSpace: 'nowrap',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};
