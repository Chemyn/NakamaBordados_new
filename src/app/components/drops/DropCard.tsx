'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/types/product';
import type { DropCampaign } from '@/types/drop';
import ProductPrice from '@/app/components/ProductPrice';
import DropCountdown from './DropCountdown';
import styles from './drops.module.css';

interface DropCardProps {
  product: Product;
  drop?: DropCampaign;
  labels: {
    presale: string;
    soldOut: string;
    released: string;
    remaining: (count: number) => string;
    days: string;
    hours: string;
    minutes: string;
    seconds: string;
    view: string;
  };
  onCountdownComplete?: () => void;
}

export default function DropCard({ product, drop, labels, onCountdownComplete }: DropCardProps) {
  const status = drop?.status || 'released';
  const badge = status === 'sold_out' ? labels.soldOut : status === 'presale' ? labels.presale : labels.released;
  const timer = drop && status !== 'released' ? (
    <DropCountdown
      launchAt={drop.launchAt}
      serverNow={drop.serverNow}
      labels={{ days: labels.days, hours: labels.hours, minutes: labels.minutes, seconds: labels.seconds }}
      onComplete={onCountdownComplete}
      compact
    />
  ) : null;

  return (
    <article className={styles.card}>
      <div className={styles.cardImageWrap}>
        <Link href={`/product?id=${product.id}`} aria-label={`${labels.view}: ${product.name}`}>
          <Image className={styles.cardImage} src={product.images[0]} alt={product.name} width={720} height={720} />
        </Link>
        <span className={`${styles.badge} ${status === 'released' ? styles.badgeReleased : ''}`}>{badge}</span>
        {drop?.timerPosition !== 'below' && timer ? <div className={styles.timerOverlay}>{timer}</div> : null}
      </div>
      {drop?.timerPosition === 'below' && timer ? <div className={styles.timerBelow}>{timer}</div> : null}
      <div className={styles.cardBody}>
        <h3><Link href={`/product?id=${product.id}`}>{product.name}</Link></h3>
        <div className={styles.cardPrice}><ProductPrice product={product} /></div>
        {drop && !drop.unlimited && drop.remaining !== null && status !== 'released' ? (
          <p className={styles.remaining}>{status === 'sold_out' ? labels.soldOut : labels.remaining(drop.remaining)}</p>
        ) : null}
        <Link className={styles.cardAction} href={`/product?id=${product.id}`}>{labels.view}<span aria-hidden="true">→</span></Link>
      </div>
    </article>
  );
}

