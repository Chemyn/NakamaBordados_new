'use client';

import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import HeroBackground from '../components/HeroBackground';

/* ---- Estilos base (estética manga: rojo + negro + sombras offset) ---- */
const secStyle: React.CSSProperties = { marginBottom: '44px' };
const h2Style: React.CSSProperties = { fontSize: '1.9rem', marginBottom: '18px', lineHeight: 1.2, color: 'var(--nk-text-main)' };
const pStyle: React.CSSProperties = { lineHeight: 1.7, color: 'var(--nk-text-sec)', marginBottom: '16px' };
const ulStyle: React.CSSProperties = { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '16px' };
const liStyle: React.CSSProperties = { position: 'relative', paddingLeft: '28px', lineHeight: 1.7, color: 'var(--nk-text-sec)' };
const markerStyle: React.CSSProperties = { position: 'absolute', left: 0, top: '8px', width: '11px', height: '11px', background: 'var(--nk-primary)', border: '2px solid #000' };
const subUlStyle: React.CSSProperties = { listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' };
const subMarkerStyle: React.CSSProperties = { ...markerStyle, background: 'var(--nk-bg-card)', top: '9px' };
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

function Bullet({ lead, children, sub = false }: { lead?: string; children?: React.ReactNode; sub?: boolean }) {
  return (
    <li style={sub ? { ...liStyle, paddingLeft: '26px' } : liStyle}>
      <span style={sub ? subMarkerStyle : markerStyle} aria-hidden="true" />
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
      <p style={{ ...pStyle, marginBottom: 0 }}>{children}</p>
    </div>
  );
}

export default function TermsPage() {
  const { t } = useLanguage();

  return (
    <div className="nk-store-page">
      <div className="nk-store-hero" style={{ background: 'var(--nk-navy)', color: '#fff', padding: '120px 24px 80px', borderBottom: '4px solid var(--nk-primary)', position: 'relative', overflow: 'hidden' }}>
        <HeroBackground pageKey="terminos-y-condiciones" />
        <div className="nk-container" style={{ position: 'relative', zIndex: 1 }}>
          <span className="nk-store-hero-badge" style={{ background: 'var(--nk-primary)', color: 'white', border: 'none' }}>{t('footer.legal')}</span>
          <h1 className="nk-store-hero-title" style={{ color: '#fff', textShadow: '4px 4px 0px #000' }}>{t('terms.title')}</h1>
          <p className="nk-store-hero-subtitle" style={{ color: '#ccc' }}>{t('terms.subtitle')}</p>
        </div>
      </div>

      <div className="nk-container" style={{ padding: '60px 24px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', background: 'var(--nk-bg-card)', padding: 'clamp(20px, 5vw, 40px)', border: '2px solid #000', boxShadow: 'var(--nk-manga-shadow-lg)' }}>
          <p style={{ marginBottom: '25px', fontStyle: 'italic', color: 'var(--nk-text-sec)' }}>Última actualización: 02 de julio de 2026</p>

          <Section n="1" title="Aceptación de los Términos y Dinámicas Comerciales">
            <p style={pStyle}>
              Al acceder y utilizar este sitio web, aceptas cumplir con los términos y condiciones aquí descritos, aplicables a todos los visitantes y usuarios del servicio.
            </p>
            <p style={{ ...pStyle, marginBottom: 0 }}>
              Adicionalmente, al realizar cualquier compra en nuestro sitio web, el cliente acepta de manera <strong style={leadStyle}>expresa, voluntaria y obligatoria</strong> los siguientes términos, condiciones y dinámicas comerciales de Nakama Bordados.
            </p>
          </Section>

          <Section n="2" title="Programa de Fidelidad y Cupones de Bienvenida (Siempre Activo)">
            <ul style={ulStyle}>
              <Bullet lead="Escala de Descuentos: ">
                Nuestro programa premia la lealtad de la comunidad otorgando un <strong style={leadStyle}>5% de descuento</strong> en la primera compra, un <strong style={leadStyle}>10%</strong> en la segunda compra y un <strong style={leadStyle}>20%</strong> en la tercera compra.
              </Bullet>
              <Bullet lead="Activación y Entrega: ">
                Los cupones se generarán y enviarán de manera automática al correo electrónico del cliente inmediatamente después de realizar y registrar el pago de su compra actual, permitiéndole conocer su beneficio para futuros pedidos.
              </Bullet>
              <Bullet lead="Vigencia Condicionada: ">
                El periodo de vigencia comenzará a contar estrictamente a partir del momento en que el estado de su pedido anterior cambie oficialmente a <strong style={leadStyle}>&ldquo;Completado&rdquo;</strong> en nuestro sistema. A partir de esa fecha exacta, el cupón de la segunda compra tendrá una validez de <strong style={leadStyle}>quince (15) días naturales</strong> y el de la tercera compra una validez de <strong style={leadStyle}>veinte (20) días naturales</strong>. Al término de estos plazos, el cupón expirará de forma definitiva sin opción a renovación.
              </Bullet>
              <Bullet lead="Cláusula de Retroactividad para Clientes Existentes: ">
                Con motivo del lanzamiento de este programa, todos aquellos clientes que ya cuenten con uno (1) o dos (2) pedidos históricos finalizados y completados con la marca antes del inicio de esta campaña, tendrán el derecho de reclamar el cupón correspondiente a su nivel actual de cliente frecuente, sujetándose a las mismas reglas y plazos de vigencia a partir del día de su emisión manual.
              </Bullet>
              <Bullet lead="Restricciones: ">
                Estos cupones de fidelidad <strong style={leadStyle}>no son acumulables ni combinables</strong> con &ldquo;Descuentos Especiales&rdquo; de temporada (Hot Sale, Buen Fin, Black Friday, etc.).
              </Bullet>
            </ul>
          </Section>

          <Section n="3" title="Política de Envío Gratis">
            <ul style={ulStyle}>
              <Bullet lead="Monto Mínimo: ">
                El beneficio de envío gratis se activa únicamente en carritos cuyo total sea <strong style={leadStyle}>mayor o igual a $1,500.00 MXN</strong>. Este valor se calcula estrictamente <strong style={leadStyle}>después</strong> de haber aplicado cualquier tipo de cupón, descuento o rebaja.
              </Bullet>
              <Bullet lead="Coextensión y Topes: ">
                El envío gratuito se gestiona a través de la paquetería <strong style={leadStyle}>Estafeta</strong> y está topado a un costo real de guía de <strong style={leadStyle}>$140.00 MXN</strong>.
              </Bullet>
              <Bullet lead="Zonas Extendidas y Preferencias: ">
                Si la dirección de entrega corresponde a una zona extendida (de difícil acceso o reexpedición) o si el cliente solicita explícitamente el cambio a otra línea de transporte, el cliente deberá cubrir la diferencia económica del costo del envío en el checkout.
              </Bullet>
            </ul>
            <Callout>
              En zonas extendidas o cambios de paquetería, <strong style={leadStyle}>el cliente deberá cubrir la diferencia económica del costo del envío</strong> en el checkout para que su orden pueda ser procesada y despachada.
            </Callout>
          </Section>

          <Section n="4" title="Facilidades de Pago (Meses Sin Intereses y Transferencias)">
            <ul style={ulStyle}>
              <Bullet lead="3 Meses Sin Intereses (MSI): ">
                Promoción permanente válida durante todo el año en compras mínimas de <strong style={leadStyle}>$2,000.00 MXN</strong>.
              </Bullet>
              <Bullet lead="6 Meses Sin Intereses (MSI): ">
                Beneficio <strong style={leadStyle}>exclusivo</strong> para campañas de Descuentos Especiales (Hot Sale, Buen Fin, Black Friday, etc.), válido únicamente en compras mínimas de <strong style={leadStyle}>$3,000.00 MXN</strong>.
              </Bullet>
              <Bullet lead="Descuento por Transferencia: ">
                Se aplicará un <strong style={leadStyle}>3% de descuento adicional</strong> de forma automatizada en el checkout al seleccionar &ldquo;Transferencia Bancaria&rdquo; como método de pago. Este beneficio se aplica sobre el monto neto final y <strong style={leadStyle}>SÍ es combinable</strong> con cualquier otra promoción, descuento especial o cupón vigente en el sitio.
              </Bullet>
            </ul>
          </Section>

          <Section n="5" title="Campañas y Descuentos Especiales (Temporada Alta)">
            <p style={pStyle}>
              Durante eventos masivos comerciales (tales como Hot Sale, Buen Fin, Black Friday, etc.), las promociones globales de temporada consistirán en:
            </p>
            <ul style={subUlStyle}>
              <Bullet lead="Opción A: " sub>
                10% de descuento directo en toda la tienda en línea.
              </Bullet>
              <Bullet lead="Opción B: " sub>
                Promoción 3x2 válida únicamente por categorías idénticas (Bordados con Bordados, Gorras con Gorras). La prenda de regalo siempre corresponderá de forma obligatoria a la de menor valor dentro del carrito en esa categoría.
              </Bullet>
            </ul>
            <Callout label="Candado de Combinación">
              La <strong style={leadStyle}>Opción A (10%)</strong> y la <strong style={leadStyle}>Opción B (3x2) NO son combinables</strong> entre sí dentro de un mismo pedido; el usuario deberá elegir una sola dinámica por transacción. Ambas opciones sí admiten de forma simultánea el Envío Gratis (+$1,500 MXN), los 3 MSI (+$2,000 MXN), los 6 MSI (+$3,000 MXN) y el 3% de descuento por transferencia.
            </Callout>
          </Section>

          <Section n="6" title="Tiempos de Fabricación y Políticas de Reembolso">
            <ul style={ulStyle}>
              <Bullet lead="Naturaleza del Producto: ">
                Todos nuestros productos de custom apparel, ropa, bordados y estampados conllevan un proceso industrial y artesanal de diseño y personalización bajo demanda.
              </Bullet>
              <Bullet lead="Ampliación de Plazos en Temporada Alta: ">
                Durante periodos de alta demanda, lanzamientos masivos o fechas promocionales (Hot Sale, Buen Fin, Black Friday, Navidad, etc.), los tiempos habituales de producción, confección y fabricación del taller se extenderán debido a la saturación de las líneas de producción.
              </Bullet>
              <Bullet lead="Aceptación de Plazos: ">
                Al finalizar su compra y procesar su pago en este sitio web, el cliente declara conocer, entender y aceptar que su orden está sujeta a un tiempo de fabricación mínimo y máximo extendido propio de la temporada alta.
              </Bullet>
            </ul>
            <Callout label="Restricción Absoluta de Reembolsos por Retraso">
              Debido a la programación inmediata de maquinaria, compra de insumos personalizados y apartado de turnos de producción que genera cada orden, <strong style={leadStyle}>NO se procesarán cancelaciones ni reembolsos económicos bajo el argumento de retraso en los tiempos de entrega o fabricación durante estas fechas de alta demanda.</strong> Nakama Bordados se compromete a confeccionar cada pieza bajo los más altos estándares de calidad, pero no se hace responsable por variaciones en las fechas estimadas causadas por la saturación de la temporada o por demoras logísticas de las paqueterías ajenas a la empresa.
            </Callout>
          </Section>

          <Section n="7" title="Propiedad Intelectual">
            <p style={{ ...pStyle, marginBottom: 0 }}>
              Todos los diseños, logotipos y contenido visual son propiedad de Nakama Bordados o se utilizan bajo licencia. Queda estrictamente prohibida la reproducción parcial o total sin consentimiento previo.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
