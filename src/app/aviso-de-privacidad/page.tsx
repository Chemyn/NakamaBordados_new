'use client';

import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import HeroBackground from '../components/HeroBackground';

export default function PrivacyPage() {
  const { t } = useLanguage();

  return (
    <div className="nk-store-page">
      <div className="nk-store-hero" style={{ background: 'var(--nk-navy)', color: '#fff', padding: '120px 24px 80px', borderBottom: '4px solid var(--nk-primary)', position: 'relative', overflow: 'hidden' }}>
        <HeroBackground pageKey="aviso-de-privacidad" />
        <div className="nk-container" style={{ position: 'relative', zIndex: 1 }}>
          <span className="nk-store-hero-badge" style={{ background: 'var(--nk-primary)', color: 'white', border: 'none' }}>{t('footer.legal')}</span>
          <h1 className="nk-store-hero-title" style={{ color: '#fff', textShadow: '4px 4px 0px #000' }}>{t('privacy.title')}</h1>
          <p className="nk-store-hero-subtitle" style={{ color: '#ccc' }}>{t('privacy.subtitle')}</p>
        </div>
      </div>

      <div className="nk-container" style={{ padding: '60px 24px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', background: 'var(--nk-bg-card)', padding: '40px', border: '2px solid #000', boxShadow: 'var(--nk-manga-shadow-lg)' }}>
          {/* Note: In a production site, the full body of legal texts would be dynamically swapped, 
              but for this prototype we'll keep the Spanish body as the primary reference and translate the headers */}
          <p style={{ marginBottom: '25px', fontStyle: 'italic', color: 'var(--nk-text-sec)' }}>Última actualización: 02 de junio de 2026</p>

          <section style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '15px' }}>1. Identidad y Domicilio</h2>
            <p style={{ lineHeight: 1.6, color: 'var(--nk-text-sec)' }}>Nakama Bordados, con domicilio en Hermosillo, Sonora, México, es responsable del tratamiento de sus datos personales conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.</p>
          </section>

          <section style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '15px' }}>2. Datos Personales Recabados</h2>
            <p style={{ lineHeight: 1.6, color: 'var(--nk-text-sec)' }}>Recabamos datos de identificación (nombre), contacto (correo electrónico, teléfono) y domicilio de envío para procesar sus pedidos y comunicarnos con usted sobre el estado de los mismos.</p>
          </section>

          <section style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '15px' }}>3. Finalidades del Tratamiento</h2>
            <p style={{ lineHeight: 1.6, color: 'var(--nk-text-sec)' }}>Sus datos serán utilizados para: procesar compras, gestionar envíos, realizar facturación, brindar soporte técnico y, en caso de que usted lo autorice, enviar promociones y noticias sobre nuestra tripulación.</p>
          </section>

          <section style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '15px' }}>4. Seguridad de los Datos</h2>
            <p style={{ lineHeight: 1.6, color: 'var(--nk-text-sec)' }}>Implementamos medidas de seguridad administrativas y técnicas para proteger sus datos personales contra daño, pérdida, alteración o acceso no autorizado. Los pagos son procesados de forma segura a través de plataformas líderes (Stripe/PayPal), por lo que Nakama Bordados no almacena información de tarjetas de crédito.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '2rem', marginBottom: '15px' }}>5. Derechos ARCO</h2>
            <p style={{ lineHeight: 1.6, color: 'var(--nk-text-sec)' }}>Usted tiene derecho al Acceso, Rectificación, Cancelación u Oposición del tratamiento de sus datos personales. Para ejercer estos derechos, puede enviarnos un correo a contacto@nakamabordados.com.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
