import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './TimeRangeSlider.module.css';

interface TimeRangeSliderProps {
    startTime: string; // Format: "T14:00:00"
    endTime: string;   // Format: "T15:00:00"
    onChange: (start: string, end: string) => void;
}

// Configuration for the slider
const MIN_HOUR = 14;
const MAX_HOUR = 22;
const TOTAL_HOURS = MAX_HOUR - MIN_HOUR;

export function TimeRangeSlider({ startTime, endTime, onChange }: TimeRangeSliderProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [localStart, setLocalStart] = useState(MIN_HOUR);
    const [localEnd, setLocalEnd] = useState(MIN_HOUR + 1);
    // Visual state for smooth dragging (float values)
    const [visualStart, setVisualStart] = useState(MIN_HOUR);
    const [visualEnd, setVisualEnd] = useState(MIN_HOUR + 1);
    const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
    const [dragStartValue, setDragStartValue] = useState<number | null>(null);

    // Convert string time (T14:00:00) to hour number (14)
    const timeToHour = (timeStr: string) => {
        if (!timeStr) return MIN_HOUR;
        const hour = parseInt(timeStr.replace('T', '').split(':')[0], 10);
        return Math.max(MIN_HOUR, Math.min(MAX_HOUR, hour));
    };

    // Convert hour number (14) to string time (T14:00:00)
    const hourToTime = (hour: number) => {
        return `T${hour.toString().padStart(2, '0')}:00:00`;
    };

    // Initialize local state from props
    useEffect(() => {
        const start = timeToHour(startTime);
        const end = timeToHour(endTime);
        if (localStart !== start) setLocalStart(start);
        if (localEnd !== end) setLocalEnd(end);
        // Only update visual if not dragging to prevent jump
        if (!isDragging) {
            setVisualStart(start);
            setVisualEnd(end);
        }
    }, [startTime, endTime, isDragging, localStart, localEnd]);

    // Calculate percentage for positioning
    const getPercent = (hour: number) => {
        return ((hour - MIN_HOUR) / TOTAL_HOURS) * 100;
    };

    const handlePointerDown = (type: 'start' | 'end') => (e: React.PointerEvent) => {
        e.preventDefault();
        setIsDragging(type);
        setDragStartValue(type === 'start' ? localStart : localEnd);
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDragging) return;
        setIsDragging(null);
        try {
            // Attempt to release capture from the target (Thumb)
            (e.target as Element).releasePointerCapture(e.pointerId);
        } catch (err) {
            // Ignore error if element didn't have capture
        }

        // Directional Snapping Logic
        // If user moved more than a small threshold (0.25 = 25% of an hour) in a direction, capture that.
        const THRESHOLD = 0.25;

        // Helper to snap based on drag start
        const snapDirectional = (current: number, start: number | null) => {
            if (start === null) return Math.round(current);

            const diff = current - start;

            // If moved left significantly
            if (diff < -THRESHOLD) {
                return Math.floor(current);
                // e.g. 17.8 (start 18) -> diff -0.2 -> floor(17.8) = 17
                // e.g. 17.2 (start 18) -> diff -0.8 -> floor(17.2) = 17
            }

            // If moved right significantly
            if (diff > THRESHOLD) {
                return Math.ceil(current);
                // e.g. 18.2 (start 18) -> diff 0.2 -> ceil(18.2) = 19
            }

            // If strictly within threshold, stay at start (snap back)
            // Unless we are already closer to another integer essentially? 
            // Actually, if I moved 17.6 to 17.5 (start 17), diff is 0.5. 
            // Wait, logic above only works if I move away from start.
            // If I dragged from 18 to 17.9 (diff -0.1), stay at 18. Good.

            return start;
        };

        const snappedStart = isDragging === 'start'
            ? snapDirectional(visualStart, dragStartValue)
            : Math.round(visualStart);

        const snappedEnd = isDragging === 'end'
            ? snapDirectional(visualEnd, dragStartValue)
            : Math.round(visualEnd);

        // Ensure constraints are met after snap
        let finalStart = snappedStart;
        let finalEnd = snappedEnd;

        if (finalStart >= finalEnd) {
            // If they collapsed, prioritize the one being dragged
            if (isDragging === 'start') finalStart = finalEnd - 1;
            else finalEnd = finalStart + 1;
        }

        // Ensure final values are within MIN_HOUR and MAX_HOUR
        finalStart = Math.max(MIN_HOUR, finalStart);
        finalEnd = Math.min(MAX_HOUR, finalEnd);

        // Re-check separation after clamping to bounds
        if (finalStart >= finalEnd) {
            finalStart = Math.max(MIN_HOUR, finalEnd - 1);
            finalEnd = Math.min(MAX_HOUR, finalStart + 1);
        }

        setVisualStart(finalStart);
        setVisualEnd(finalEnd);
        setLocalStart(finalStart);
        setLocalEnd(finalEnd);
        setDragStartValue(null);
        onChange(hourToTime(finalStart), hourToTime(finalEnd));
    };

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDragging || !trackRef.current) return;

        const rect = trackRef.current.getBoundingClientRect();
        const percent = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));

        // Raw float hour for smooth visual
        const rawHour = MIN_HOUR + (percent / 100) * TOTAL_HOURS;

        if (isDragging === 'start') {
            // Let's allow smooth movement but clamp to (MIN, visualEnd - 0.1)
            const newStart = Math.min(rawHour, visualEnd - 0.1);
            if (newStart >= MIN_HOUR) {
                setVisualStart(newStart);
                // Update integer value for display if it crosses threshold
                setLocalStart(Math.round(newStart));
            }
        } else {
            const newEnd = Math.max(rawHour, visualStart + 0.1);
            if (newEnd <= MAX_HOUR) {
                setVisualEnd(newEnd);
                setLocalEnd(Math.round(newEnd));
            }
        }
    }, [isDragging, visualStart, visualEnd]);

    // Handle click on track to jump to nearest position
    const handleTrackClick = (e: React.MouseEvent) => {
        if (isDragging) return; // Ignore if dragging
        if (!trackRef.current) return;

        const rect = trackRef.current.getBoundingClientRect();
        const percent = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
        const rawHour = MIN_HOUR + (percent / 100) * TOTAL_HOURS;
        const clickedHour = Math.round(rawHour);

        // Determine if we should move start or end
        const distToStart = Math.abs(clickedHour - localStart);
        const distToEnd = Math.abs(clickedHour - localEnd);

        if (distToStart < distToEnd) {
            // Move start, but keep it < end
            const newStart = Math.min(clickedHour, localEnd - 1);
            if (newStart >= MIN_HOUR) {
                setLocalStart(newStart);
                setVisualStart(newStart);
                onChange(hourToTime(newStart), hourToTime(localEnd));
            }
        } else {
            // Move end, but keep it > start
            const newEnd = Math.max(clickedHour, localStart + 1);
            if (newEnd <= MAX_HOUR) {
                setLocalEnd(newEnd);
                setVisualEnd(newEnd);
                onChange(hourToTime(localStart), hourToTime(newEnd));
            }
        }
    };

    // Generate labels
    const labels = [];
    for (let i = MIN_HOUR; i <= MAX_HOUR; i++) {
        labels.push(i);
    }

    return (
        <div className={styles.sliderContainer}>
            <div className={styles.timeDisplay}>
                <div className={styles.timeBlock}>
                    <span className={styles.timeValue}>{localStart}:00</span>
                    <span className={styles.subLabel}>来塾</span>
                </div>
                <span className={styles.timeSeparator}>-</span>
                <div className={styles.timeBlock}>
                    <span className={styles.timeValue}>{localEnd}:00</span>
                    <span className={styles.subLabel}>退塾</span>
                </div>
                <div className={styles.durationBadge}>
                    {localEnd - localStart}時間
                </div>
            </div>

            <div
                className={styles.trackWrapper}
                ref={trackRef}
                onClick={handleTrackClick}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={(e) => isDragging && handlePointerUp(e)} // Safety
            >
                <div className={styles.track} />
                <div
                    className={styles.range}
                    style={{
                        left: `${getPercent(visualStart)}%`,
                        width: `${getPercent(visualEnd) - getPercent(visualStart)}%`
                    }}
                />

                {/* Start Thumb */}
                <div
                    className={styles.thumb}
                    style={{ left: `${getPercent(visualStart)}%` }}
                    onPointerDown={handlePointerDown('start')}
                    onPointerUp={handlePointerUp}
                />

                {/* End Thumb */}
                <div
                    className={styles.thumb}
                    style={{ left: `${getPercent(visualEnd)}%` }}
                    onPointerDown={handlePointerDown('end')}
                    onPointerUp={handlePointerUp}
                />
            </div>

            <div className={styles.labels}>
                {labels.map(hour => (
                    <div
                        key={hour}
                        className={styles.label}
                        style={{ left: `${getPercent(hour)}%` }}
                    >
                        {hour}
                    </div>
                ))}
            </div>
        </div>
    );
}
