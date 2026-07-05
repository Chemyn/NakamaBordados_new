'use client';

import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import HeroBackground from '../components/HeroBackground';

/* ---- Estilos base (misma estética manga que terminos-y-condiciones) ---- */
const secStyle: React.CSSProperties = { marginBottom: '44px' };
const h2Style: React.CSSProperties = { fontSize: '1.9rem', marginBottom: '18px', lineHeight: 1.2, color: 'var(--nk-text-main)' };
const pStyle: React.CSSProperties = { lineHeight: 1.7, color: 'var(--nk-text-sec)', marginBottom: '16px' };
const ulStyle: React.CSSProperties = { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '16px' };
const liStyle: React.CSSProperties = { position: 'relative', paddingLeft: '28px', lineHeight: 1.7, color: 'var(--nk-text-sec)' };
const markerStyle: React.CSSProperties = { position: 'absolute', left: 0, top: '8px', width: '11px', height: '11px', background: 'var(--nk-primary)', border: '2px solid #000' };
const leadStyle: React.CSSProperties = { color: 'var(--nk-text-main)', fontWeight: 800 };

/* ---- Componentes auxiliares ---- */
function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section style={secStyle}>
      <h2 style={h2Style}>
        <span style={{ color: 'var(--nk-primary)', fontWeight: 900 }}>{n}.</span> {title}
      </h2>
      {children}
    </section>
  );
}

function Bullet({ lead, children }: { lead?: string; children?: React.ReactNode }) {
  return (
    <li style={liStyle}>
      <span style={markerStyle} aria-hidden="true" />
      {lead && <strong style={leadStyle}>{lead}</strong>}
      {children}
    </li>
  );
}

function Callout({ label = 'Importante', children }: { label?: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: '18px',
        background: 'rgba(var(--nk-primary-rgb), 0.07)',
        borderLeft: '5px solid var(--nk-primary)',
        border: '2px solid #000',
        boxShadow: 'var(--nk-manga-shadow)',
        padding: '18px 20px',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          background: 'var(--nk-primary)',
          color: '#fff',
          fontWeight: 900,
          fontSize: '0.72rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          padding: '3px 10px',
          border: '2px solid #000',
          marginBottom: '12px',
        }}
      >
        ⚠ {label}
      </span>
      <p style={{ ...pStyle, marginBottom: 0, overflowWrap: 'anywhere' }}>{children}</p>
    </div>
  );
}

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
        <div style={{ maxWidth: '900px', margin: '0 auto', background: 'var(--nk-bg-card)', padding: 'clamp(20px, 5vw, 40px)', border: '2px solid #000', boxShadow: 'var(--nk-manga-shadow-lg)' }}>
          <p style={{ marginBottom: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--nk-text-main)' }}>Aviso de Privacidad Integral</p>
          <p style={{ marginBottom: '25px', fontStyle: 'italic', color: 'var(--nk-text-sec)' }}>Última actualización: 05 de julio de 2026</p>

          <Section n="1" title="Identidad y Domicilio del Responsable">
            <p style={{ ...pStyle, marginBottom: 0 }}>
              <strong style={leadStyle}>Jose Conrado Lopez Anaya</strong> (operando comercialmente bajo el nombre de <strong style={leadStyle}>Nakama Bordados</strong>), con domicilio en la ciudad de Hermosillo, Sonora, México, es el responsable del uso y protección de sus datos personales, y al respecto le informamos lo siguiente:
            </p>
          </Section>

          <Section n="2" title="Datos Personales que Recabamos">
            <p style={pStyle}>
              Para llevar a cabo las finalidades descritas en el presente aviso de privacidad, utilizaremos los siguientes datos personales:
            </p>
            <ul style={ulStyle}>
              <Bullet lead="Datos de identificación: ">
                Nombre completo.
              </Bullet>
              <Bullet lead="Datos de contacto: ">
                Correo electrónico, teléfono celular o fijo.
              </Bullet>
              <Bullet lead="Datos patrimoniales/financieros: ">
                Información de facturación (RFC, Régimen Fiscal y Código Postal).
              </Bullet>
              <Bullet lead="Datos de envío: ">
                Dirección completa (Calle, número, colonia, código postal, ciudad y estado) para la entrega de mercancía.
              </Bullet>
            </ul>
            <Callout label="Nota sobre pagos">
              Los datos de tarjetas de crédito o débito son procesados directamente por plataformas de pago seguras (Stripe, PayPal, Mercado Pago); <strong style={leadStyle}>Nakama Bordados no almacena ni tiene acceso a dicha información bancaria</strong>.
            </Callout>
          </Section>

          <Section n="3" title="Finalidades del Tratamiento de los Datos">
            <p style={pStyle}>
              Los datos personales que recabamos de usted los utilizaremos para las siguientes <strong style={leadStyle}>finalidades primarias</strong>, las cuales son necesarias para el servicio que solicita:
            </p>
            <ul style={ulStyle}>
              <Bullet>Procesar, confeccionar y dar seguimiento a sus pedidos de custom apparel y bordados.</Bullet>
              <Bullet>Gestionar el envío y entrega de sus productos a través de empresas de logística y paquetería.</Bullet>
              <Bullet>Emitir las facturas fiscales correspondientes en caso de ser solicitadas.</Bullet>
              <Bullet>Brindar soporte técnico, atención al cliente y resolver dudas sobre sus transacciones.</Bullet>
            </ul>
            <p style={{ ...pStyle, marginTop: '16px' }}>
              De manera adicional, utilizaremos su información para las siguientes <strong style={leadStyle}>finalidades secundarias</strong> que no son necesarias para el servicio solicitado, pero que nos permiten brindarle una mejor atención:
            </p>
            <ul style={ulStyle}>
              <Bullet>Enviar promociones, cupones de fidelidad, descuentos especiales y noticias exclusivas sobre los lanzamientos de nuestra tripulación.</Bullet>
            </ul>
            <Callout label="Negativa a finalidades secundarias">
              Si usted no desea que sus datos personales sean tratados para estas finalidades secundarias, puede manifestarlo desde este momento enviando un correo a <strong style={leadStyle}>contacto@nakamabordados.com</strong>.
            </Callout>
          </Section>

          <Section n="4" title="Transferencia de Datos Personales">
            <p style={{ ...pStyle, marginBottom: 0 }}>
              Le informamos que sus datos personales de contacto y envío son compartidos de forma obligatoria con <strong style={leadStyle}>empresas de transporte y logística</strong> (tales como Estafeta, DHL, FedEx, entre otras) con la única finalidad de realizar la entrega a domicilio de los productos adquiridos. Fuera de estos casos, <strong style={leadStyle}>Nakama Bordados no venderá, distribuirá ni transferirá sus datos a terceros</strong> sin su consentimiento previo.
            </p>
          </Section>

          <Section n="5" title="Derechos ARCO (Acceso, Rectificación, Cancelación y Oposición)">
            <p style={pStyle}>
              Usted tiene derecho a conocer qué datos personales tenemos de usted, para qué los utilizamos y las condiciones del uso que les damos (<strong style={leadStyle}>Acceso</strong>). Asimismo, es su derecho solicitar la corrección de su información personal en caso de que esté desactualizada, sea inexacta o incompleta (<strong style={leadStyle}>Rectificación</strong>); que la eliminemos de nuestros registros o bases de datos cuando considere que la misma no está siendo utilizada adecuadamente (<strong style={leadStyle}>Cancelación</strong>); así como oponerse al uso de sus datos personales para fines específicos (<strong style={leadStyle}>Oposición</strong>).
            </p>
            <p style={{ ...pStyle, marginBottom: 0, overflowWrap: 'anywhere' }}>
              Para el ejercicio de cualquiera de los derechos ARCO, usted deberá enviar una solicitud por escrito al correo electrónico: <strong style={leadStyle}>contacto@nakamabordados.com</strong>, detallando su nombre, el derecho que desea ejercer y una identificación oficial para validar su identidad.
            </p>
          </Section>

          <Section n="6" title="Uso de Tecnologías de Rastreo (Cookies)">
            <p style={{ ...pStyle, marginBottom: 0 }}>
              Le informamos que en nuestra página de internet utilizamos <strong style={leadStyle}>cookies y otras tecnologías</strong> a través de las cuales es posible monitorear su comportamiento como usuario de internet, brindarle un mejor servicio y experiencia al navegar en nuestra página, así como ofrecerle publicidad personalizada en plataformas como Facebook, Instagram y TikTok. Los datos que se obtienen son anónimos y estadísticos. Usted puede deshabilitar el uso de cookies desde la configuración de su navegador web.
            </p>
          </Section>

          <Section n="7" title="Cambios al Aviso de Privacidad">
            <p style={{ ...pStyle, marginBottom: 0 }}>
              El presente aviso de privacidad puede sufrir modificaciones, cambios o actualizaciones derivadas de nuevos requerimientos legales, de nuestras propias necesidades por los productos o servicios que ofrecemos, o de nuestras prácticas de privacidad. Nos comprometemos a mantenerlo informado sobre los cambios que pueda sufrir este aviso de privacidad a través de su publicación directa en nuestro sitio web <strong style={leadStyle}>nakamabordados.com</strong>.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
