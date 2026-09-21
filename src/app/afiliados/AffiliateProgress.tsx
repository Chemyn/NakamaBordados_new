'use client';

import { useLanguage } from '../context/LanguageContext';
import type { AffiliateProgressData } from '@/lib/affiliates-api';
import styles from './affiliate.module.css';

const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });

function fill(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce((text, [key, value]) => text.replace(`{${key}}`, String(value)), template);
}

export default function AffiliateProgress({ progress }: { progress: AffiliateProgressData }) {
  const { t } = useLanguage();
  const max = progress.next?.thresholdMxn ?? 30000;
  const current = Math.min(max, Math.max(0, progress.salesMxn));
  const reward = progress.quota === 1
    ? t('affiliates.mission.oneProduct')
    : fill(t('affiliates.mission.manyProducts'), { count: progress.quota });
  const nextMessage = progress.next
    ? fill(t('affiliates.mission.remaining'), {
        amount: mxn.format(progress.next.remainingMxn),
        count: progress.next.rewardQuota,
      })
    : t('affiliates.mission.maxReached');

  return (
    <section className={styles.progressCard} aria-labelledby="affiliate-progress-title">
      <div className={styles.mangaBurst} aria-hidden="true">IMPACTO</div>
      <div className={styles.progressHeading}>
        <div>
          <span>{t('affiliates.mission.progressKicker')}</span>
          <h2 id="affiliate-progress-title">{t('affiliates.mission.progressTitle')}</h2>
        </div>
        <div className={styles.rewardStamp}>
          <span>{t('affiliates.mission.currentReward')}</span>
          <strong>{reward}</strong>
        </div>
      </div>
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={current}
        aria-label={nextMessage}
      >
        <span style={{ transform: `scaleX(${max > 0 ? Math.min(1, current / max) : 0})` }} />
      </div>
      <div className={styles.progressNumbers}>
        <strong>{mxn.format(progress.salesMxn)}</strong>
        <span>{mxn.format(max)}</span>
      </div>
      <ul className={styles.milestoneList} aria-label={t('affiliates.mission.milestones')}>
        <li data-reached={progress.milestones.second.reached}>
          <strong>{mxn.format(progress.milestones.second.thresholdMxn)}</strong>
          <span>{fill(t('affiliates.mission.manyProducts'), { count: 2 })}</span>
        </li>
        <li data-reached={progress.milestones.third.reached}>
          <strong>{mxn.format(progress.milestones.third.thresholdMxn)}</strong>
          <span>{fill(t('affiliates.mission.manyProducts'), { count: 3 })}</span>
        </li>
      </ul>
      <p className={styles.nextMission}>{nextMessage}</p>
      <p className={styles.noCarryNote}>{t('affiliates.mission.noCarry')}</p>
    </section>
  );
}
