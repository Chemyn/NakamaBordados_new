'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetchProducts } from '@/lib/products-api';
import { apiFetchDrops } from '@/lib/drops-api';
import { mapDropsByProduct } from '@/lib/drops';
import type { Product } from '@/types/product';
import type { DropCampaign } from '@/types/drop';
import { useLanguage } from '@/app/context/LanguageContext';
import DropCard from '@/app/components/drops/DropCard';
import styles from './drops.module.css';

const copy = {
  es: {
    eyebrow: 'LANZAMIENTOS PROGRAMADOS', title: 'DROPS', hero: 'Piezas que llegan en una fecha exacta. Asegura la tuya antes del lanzamiento.',
    noticeTitle: 'Esto es una preventa', notice: 'La elaboración de estas prendas comienza a partir de su fecha de lanzamiento. Si combinas preventa y productos disponibles, todo el pedido comenzará a procesarse desde la fecha más tardía.',
    noticeTip: '¿Quieres recibir antes lo que ya está disponible? Realiza dos pedidos distintos.', upcoming: 'Próximos DROPS', released: 'Ya disponibles',
    emptyUpcoming: 'No hay nuevos lanzamientos programados por ahora.', emptyReleased: 'Los lanzamientos anteriores aparecerán aquí.', error: 'No fue posible cargar los DROPS. Inténtalo de nuevo.', retry: 'Reintentar', loading: 'Cargando lanzamientos…',
    presale: 'Preventa', soldOut: 'Preventa agotada', available: 'Ya disponible', remaining: (n: number) => `Quedan ${n} en preventa`, view: 'Ver producto', days: 'Días', hours: 'Horas', minutes: 'Min', seconds: 'Seg',
  },
  en: {
    eyebrow: 'SCHEDULED RELEASES', title: 'DROPS', hero: 'Pieces arriving on an exact date. Secure yours before launch.',
    noticeTitle: 'This is a presale', notice: 'Production starts from each item’s launch date. If you mix presale and available products, the full order will begin processing from the latest date.',
    noticeTip: 'Want available products sooner? Place two separate orders.', upcoming: 'Upcoming DROPS', released: 'Now available',
    emptyUpcoming: 'There are no scheduled launches right now.', emptyReleased: 'Previous releases will appear here.', error: 'We could not load DROPS. Please try again.', retry: 'Try again', loading: 'Loading releases…',
    presale: 'Presale', soldOut: 'Presale sold out', available: 'Now available', remaining: (n: number) => `${n} left in presale`, view: 'View product', days: 'Days', hours: 'Hours', minutes: 'Min', seconds: 'Sec',
  },
};

export default function DropsClient() {
  const { language } = useLanguage();
  const text = copy[language];
  const [products, setProducts] = useState<Product[]>([]);
  const [campaigns, setCampaigns] = useState<DropCampaign[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = useCallback(async () => {
    setState('loading');
    const [drops, upcomingProducts, releasedProducts] = await Promise.all([
      apiFetchDrops(),
      apiFetchProducts({ category: 'drops', limit: 100 }),
      apiFetchProducts({ category: 'ya-disponible', limit: 100 }),
    ]);
    const merged = [...upcomingProducts.products, ...releasedProducts.products].filter((product, index, all) => all.findIndex((item) => item.id === product.id) === index);
    setCampaigns(drops.items);
    setProducts(merged);
    setState(merged.length || drops.items.length ? 'ready' : 'ready');
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) load().catch(() => setState('error'));
    });
    return () => { active = false; };
  }, [load]);

  const campaignMap = useMemo(() => mapDropsByProduct(campaigns), [campaigns]);
  const withDrop = useMemo(() => products.map((product) => ({
    product: { ...product, drop: campaignMap.get(String(product.databaseId)) || campaignMap.get(product.id) },
    drop: campaignMap.get(String(product.databaseId)) || campaignMap.get(product.id),
  })), [campaignMap, products]);
  const upcoming = withDrop.filter(({ drop, product }) => drop?.status !== 'released' && product.categories.includes('drops'));
  const released = withDrop.filter(({ drop, product }) => drop?.status === 'released' || product.categories.includes('ya-disponible'));
  const labels = { presale: text.presale, soldOut: text.soldOut, released: text.available, remaining: text.remaining, view: text.view, days: text.days, hours: text.hours, minutes: text.minutes, seconds: text.seconds };

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.container}><p>{text.eyebrow}</p><h1>{text.title}</h1><div className={styles.heroRule} /><h2>{text.hero}</h2></div>
      </section>
      <div className={styles.body}>
        <div className={styles.container}>
          <aside className={styles.notice} aria-labelledby="drop-notice-title"><div className={styles.noticeIcon} aria-hidden="true">!</div><div><h2 id="drop-notice-title">{text.noticeTitle}</h2><p>{text.notice}</p><strong>{text.noticeTip}</strong></div></aside>
          {state === 'loading' ? <div className={styles.status} role="status">{text.loading}</div> : null}
          {state === 'error' ? <div className={styles.status}><p>{text.error}</p><button type="button" onClick={load}>{text.retry}</button></div> : null}
          {state === 'ready' ? (
            <>
              <section className={styles.section} aria-labelledby="upcoming-drops"><header><p>01</p><h2 id="upcoming-drops">{text.upcoming}</h2><span>{upcoming.length}</span></header>{upcoming.length ? <div className={styles.grid}>{upcoming.map(({ product, drop }) => <DropCard key={product.id} product={product} drop={drop} labels={labels} onCountdownComplete={load} />)}</div> : <p className={styles.empty}>{text.emptyUpcoming}</p>}</section>
              <section className={styles.section} aria-labelledby="released-drops"><header><p>02</p><h2 id="released-drops">{text.released}</h2><span>{released.length}</span></header>{released.length ? <div className={styles.grid}>{released.map(({ product, drop }) => <DropCard key={product.id} product={product} drop={drop} labels={labels} />)}</div> : <p className={styles.empty}>{text.emptyReleased}</p>}</section>
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
}
