'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  GA_MEASUREMENT_ID,
  FB_PIXEL_ID,
  isTrackingHost,
  trackPageView,
} from '@/lib/analytics';
import { getCookieConsent, CONSENT_EVENT } from '@/lib/cookie-consent';

/**
 * Carga GA4 (gtag.js) y el Meta Pixel (fbevents) en el frontend headless y
 * dispara page_view/PageView en CADA navegación del App Router — el sitio es
 * una SPA tras la primera carga, así que sin esto GA solo contaría la primera
 * página. Ambos snippets se configuran SIN page view automático y el evento
 * se manda solo desde el effect de ruta: un único camino, sin dobles conteos.
 *
 * Consentimiento: los scripts SOLO se montan si el cliente aceptó las cookies
 * (banner CookieBanner). Mientras rechace o no decida, no se descarga nada. El
 * banner avisa la aceptación con CONSENT_EVENT para arrancar sin recargar.
 *
 * Requiere <Suspense> en el punto de montaje (useSearchParams, App Router).
 */
export default function Analytics() {
  // El guard corre en un effect (no en render) para que el HTML estático y la
  // hidratación coincidan; en localhost/dev queda en false y no se carga nada.
  const [enabled, setEnabled] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isTrackingHost()) return; // dev/localhost: nunca se mide
    if (getCookieConsent() === 'accepted') {
      setEnabled(true);
      return;
    }
    // Sin aceptación aún: esperar a que el cliente acepte en el banner.
    const onConsent = (e: Event) => {
      if ((e as CustomEvent).detail === 'accepted') setEnabled(true);
    };
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_EVENT, onConsent);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const search = searchParams.toString();
    trackPageView(search ? `${pathname}?${search}` : pathname);
  }, [enabled, pathname, searchParams]);

  if (!enabled) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="nk-gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
        `}
      </Script>
      <Script id="nk-fb-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${FB_PIXEL_ID}');
        `}
      </Script>
    </>
  );
}
