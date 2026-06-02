'use client';

import React from 'react';
import Link from 'next/link';

export default function FAQPage() {
  const faqs = [
    {
      q: "¿Cuánto tiempo tarda en llegar mi pedido?",
      a: "El tiempo de elaboración es de 7 a 15 días hábiles, ya que cada pieza se fabrica bajo pedido para asegurar la máxima calidad. Una vez enviado, el tiempo de entrega depende de la paquetería (Estafeta o FedEx), usualmente de 2 a 5 días."
    },
    {
      q: "¿Hacen envíos a todo México?",
      a: "Sí, realizamos envíos a toda la República Mexicana a través de Envia.com con las mejores paqueterías del país."
    },
    {
      q: "¿Cómo puedo rastrear mi paquete?",
      a: "Puedes rastrearlo directamente en nuestra sección 'Mi Cuenta' si estás registrado, o ingresando el número de guía que te enviaremos por correo en el portal oficial de la paquetería correspondiente."
    },
    {
      q: "¿Tienen tienda física?",
      a: "Actualmente operamos exclusivamente de manera online para poder ofrecer la mayor variedad de diseños a nakamas de todo México."
    },
    {
      q: "¿Qué cuidados debo tener con mi prenda bordada?",
      a: "Recomendamos lavar la prenda al revés con agua fría, no usar secadora y nunca planchar directamente sobre el bordado para preservar la densidad y el color de los hilos."
    }
  ];

  return (
    <div className="nk-store-page">
      <div className="nk-store-hero" style={{ background: 'var(--nk-navy)', color: '#fff', padding: '120px 24px 80px', borderBottom: '4px solid var(--nk-primary)' }}>
        <div className="nk-container">
          <span className="nk-store-hero-badge" style={{ background: 'var(--nk-primary)', color: 'white', border: 'none' }}>Soporte</span>
          <h1 className="nk-store-hero-title" style={{ color: '#fff', textShadow: '4px 4px 0px #000' }}>Preguntas Frecuentes</h1>
          <p className="nk-store-hero-subtitle" style={{ color: '#ccc' }}>Todo lo que necesitas saber para tu próxima misión.</p>
        </div>
      </div>

      <div className="nk-container" style={{ padding: '60px 24px' }}>
        <div className="nk-faq-grid" style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {faqs.map((faq, idx) => (
            <div key={idx} className="nk-faq-item nk-manga-border" style={{ padding: '30px', background: 'var(--nk-bg-card)', boxShadow: 'var(--nk-manga-shadow)' }}>
              <h3 style={{ fontSize: '1.8rem', color: 'var(--nk-primary)', marginBottom: '15px', lineHeight: 1.1 }}>{faq.q}</h3>
              <p style={{ fontSize: '1.1rem', color: 'var(--nk-text-sec)', lineHeight: 1.6 }}>{faq.a}</p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '60px' }}>
          <p style={{ marginBottom: '20px', fontWeight: 600 }}>¿Aún tienes dudas?</p>
          <Link href="https://wa.me/526622455087" target="_blank" className="nk-btn">
            Contáctanos por WhatsApp
          </Link>
        </div>
      </div>
    </div>
  );
}
