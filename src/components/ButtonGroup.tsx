import styles from './ButtonGroup.module.css';

interface ButtonGroupOption {
    value: string;
    label: string;
}

interface ButtonGroupProps {
    options: readonly ButtonGroupOption[] | ButtonGroupOption[];
    value: string;
    onChange: (value: string) => void;
    name: string;
}

export function ButtonGroup({ options, value, onChange, name }: ButtonGroupProps) {
    return (
        <div className={styles.buttonGroup}>
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    className={`${styles.button} ${value === option.value ? styles.selected : ''}`}
                    onClick={() => onChange(option.value)}
                    aria-pressed={value === option.value}
                    aria-label={`${name}: ${option.label}`}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
