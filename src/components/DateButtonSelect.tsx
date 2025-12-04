import { useMemo } from 'react';
import styles from './DateButtonSelect.module.css';

interface DateButtonSelectProps {
    value: string;
    onChange: (value: string) => void;
    name: string;
}

export function DateButtonSelect({ value, onChange, name }: DateButtonSelectProps) {
    const dateOptions = useMemo(() => {
        const options = [];
        const today = new Date();

        for (let i = 0; i < 8; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);

            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateValue = `${year}-${month}-${day}`;

            const monthLabel = date.getMonth() + 1;
            const dayLabel = date.getDate();
            const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
            const weekday = weekdays[date.getDay()];

            const isToday = i === 0;
            const isTomorrow = i === 1;

            options.push({
                value: dateValue,
                label: `${monthLabel}/${dayLabel}`,
                weekday: weekday,
                isToday,
                isTomorrow,
                isSaturday: date.getDay() === 6,
                isSunday: date.getDay() === 0,
            });
        }

        return options;
    }, []);

    return (
        <div className={styles.dateGrid}>
            {dateOptions.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    className={`
                        ${styles.dateButton} 
                        ${value === option.value ? styles.selected : ''}
                        ${option.isSaturday ? styles.saturday : ''}
                        ${option.isSunday ? styles.sunday : ''}
                    `}
                    onClick={() => onChange(option.value)}
                    aria-pressed={value === option.value}
                    aria-label={`${name}: ${option.label} (${option.weekday})`}
                >
                    {(option.isToday || option.isTomorrow) && (
                        <span className={styles.badge}>
                            {option.isToday ? '本日' : '明日'}
                        </span>
                    )}
                    <span className={styles.date}>{option.label}</span>
                    <span className={styles.weekday}>({option.weekday})</span>
                </button>
            ))}
        </div>
    );
}
