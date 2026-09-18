'use client';

import { useEffect, useMemo, useState } from 'react';
import { countdownParts, createServerClock } from '@/lib/drops';
import styles from './drops.module.css';

interface DropCountdownProps {
  launchAt: string;
  serverNow: string;
  labels: { days: string; hours: string; minutes: string; seconds: string };
  onComplete?: () => void;
  compact?: boolean;
}

const twoDigits = (value: number) => String(value).padStart(2, '0');

export default function DropCountdown({ launchAt, serverNow, labels, onComplete, compact = false }: DropCountdownProps) {
  const clock = useMemo(() => createServerClock(serverNow), [serverNow]);
  const target = useMemo(() => Date.parse(launchAt), [launchAt]);
  const [parts, setParts] = useState(() => countdownParts(target, clock.now()));

  useEffect(() => {
    let completed = false;
    const update = () => {
      const next = countdownParts(target, clock.now());
      setParts(next);
      if (next.complete && !completed) {
        completed = true;
        onComplete?.();
      }
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [clock, onComplete, target]);

  const units = [
    [parts.days, labels.days],
    [parts.hours, labels.hours],
    [parts.minutes, labels.minutes],
    [parts.seconds, labels.seconds],
  ] as const;

  return (
    <div
      className={`${styles.countdown} dropCountdown ${compact ? styles.countdownCompact : ''}`}
      data-testid="drop-countdown"
      aria-label={`${labels.days}: ${parts.days}, ${labels.hours}: ${parts.hours}, ${labels.minutes}: ${parts.minutes}, ${labels.seconds}: ${parts.seconds}`}
    >
      {units.map(([value, label]) => (
        <div className={styles.countdownUnit} key={label} aria-hidden="true">
          <strong>{twoDigits(value)}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

