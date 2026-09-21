'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import type { AffiliateEvidenceInput, AffiliateEvidenceItem } from '@/lib/affiliates-api';
import styles from './affiliate.module.css';

interface Props {
  requestId: number;
  requestStatus: string;
  items: AffiliateEvidenceItem[];
  officialAccounts: string[];
  onSubmit: (input: AffiliateEvidenceInput) => Promise<{ success: boolean; reason?: string }>;
}

const slots = [
  { key: 'reel_1', labelKey: 'affiliates.mission.reel1', required: true },
  { key: 'reel_2', labelKey: 'affiliates.mission.reel2', required: true },
  { key: 'story_1', labelKey: 'affiliates.mission.story', required: true },
  { key: 'bonus', labelKey: 'affiliates.mission.bonusLabel', required: false },
] as const;

type Urls = AffiliateEvidenceInput['urls'];

export default function AffiliateEvidence({ requestId, requestStatus, items, officialAccounts, onSubmit }: Props) {
  const { t } = useLanguage();
  const storageKey = `nakama-affiliate-evidence-${requestId}`;
  const bySlot = useMemo(() => new Map(items.map(item => [item.slotKey, item])), [items]);
  const [urls, setUrls] = useState<Urls>(() => {
    let draft: Partial<Urls> = {};
    if (typeof window !== 'undefined') {
      try { draft = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { draft = {}; }
    }
    const value = { reel_1: '', reel_2: '', story_1: '', bonus: '', ...draft };
    for (const item of items) {
      if (item.status !== 'rejected' || !draft[item.slotKey]) value[item.slotKey] = item.url;
    }
    return value;
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Urls, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(urls)); }, [storageKey, urls]);

  const editable = (slot: keyof Urls) => {
    const item = bySlot.get(slot);
    return !item || item.status === 'rejected';
  };
  const validUrl = (value: string) => {
    try { return new URL(value).protocol === 'https:'; } catch { return false; }
  };
  const validate = (slot: keyof Urls, required: boolean) => {
    const value = urls[slot].trim();
    const error = required && !value
      ? t('affiliates.mission.evidenceRequired')
      : value && !validUrl(value)
        ? t('affiliates.mission.evidenceHttps')
        : '';
    setErrors(current => ({ ...current, [slot]: error }));
    return !error;
  };
  const canSubmit = ['shipped', 'completed'].includes(requestStatus)
    && slots.filter(slot => slot.required).every(slot => urls[slot.key].trim() && validUrl(urls[slot.key]))
    && slots.some(slot => editable(slot.key) && urls[slot.key].trim());
  const submit = async () => {
    const valid = slots.every(slot => validate(slot.key, slot.required));
    if (!valid || !canSubmit) return;
    setSubmitting(true);
    setMessage('');
    setFailed(false);
    try {
      const result = await onSubmit({ requestId, urls });
      if (!result.success) throw new Error(result.reason || t('affiliates.mission.evidenceError'));
      localStorage.removeItem(storageKey);
      setMessage(t('affiliates.mission.evidenceSent'));
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : t('affiliates.mission.evidenceError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={styles.missionCard} aria-labelledby="affiliate-evidence-title">
      <div className={styles.missionHeading}><span aria-hidden="true">03</span><div><p>{t('affiliates.mission.evidenceKicker')}</p><h2 id="affiliate-evidence-title">{t('affiliates.mission.evidenceTitle')}</h2></div></div>
      <div className={styles.ruleCallout}>
        <p>{t('affiliates.mission.tagReminder')} <strong>{officialAccounts.length ? officialAccounts.join(', ') : t('affiliates.mission.officialAccounts')}</strong>.</p>
        <p>{t('affiliates.mission.codeReminder')}</p>
      </div>
      {!['shipped', 'completed'].includes(requestStatus) && <p className={styles.waitingNote}>{t('affiliates.mission.evidenceWaiting')}</p>}
      <div className={styles.evidenceGrid}>
        {slots.map(slot => {
          const item = bySlot.get(slot.key);
          const isEditable = editable(slot.key) && ['shipped', 'completed'].includes(requestStatus);
          const errorId = `evidence-${slot.key}-error`;
          return (
            <div className={styles.evidenceField} key={slot.key}>
              <label htmlFor={`evidence-${slot.key}`}>{t(slot.labelKey)} · {slot.required ? t('affiliates.mission.required') : t('affiliates.mission.optional')}</label>
              <input
                id={`evidence-${slot.key}`}
                type="url"
                inputMode="url"
                value={urls[slot.key]}
                disabled={!isEditable}
                aria-invalid={Boolean(errors[slot.key])}
                aria-describedby={errors[slot.key] ? errorId : undefined}
                onChange={event => setUrls(current => ({ ...current, [slot.key]: event.target.value }))}
                onBlur={() => validate(slot.key, slot.required)}
                placeholder="https://"
              />
              {item && <span className={`${styles.evidenceStatus} ${styles[`evidenceStatus_${item.status}`]}`}>{t(`affiliates.mission.evidenceStatus.${item.status}`)}</span>}
              {item?.reviewReason && <p className={styles.inlineError}>{item.reviewReason}</p>}
              {errors[slot.key] && <p id={errorId} className={styles.fieldError}>{errors[slot.key]}</p>}
            </div>
          );
        })}
      </div>
      <p className={styles.bonusNote}>{t('affiliates.mission.bonus')}</p>
      {['shipped', 'completed'].includes(requestStatus) && (
        <button className={`nk-btn ${styles.primaryMissionAction}`} type="button" disabled={!canSubmit || submitting} onClick={() => void submit()}>
          {submitting ? t('affiliates.mission.sending') : t('affiliates.mission.sendEvidence')}
        </button>
      )}
      {message && <p className={failed ? styles.inlineError : styles.inlineSuccess} role={failed ? 'alert' : 'status'}>{message}</p>}
    </section>
  );
}
