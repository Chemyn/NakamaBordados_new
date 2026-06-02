'use client';

import React from 'react';

export default function TermsPage() {
  return (
    <div className="nk-store-page">
      <div className="nk-store-hero" style={{ background: 'var(--nk-navy)', color: '#fff', padding: '120px 24px 80px', borderBottom: '4px solid var(--nk-primary)' }}>
        <div className="nk-container">
          <span className="nk-store-hero-badge" style={{ background: 'var(--nk-primary)', color: 'white', border: 'none' }}>Legal</span>
          <h1 className="nk-store-hero-title" style={{ color: '#fff', textShadow: '4px 4px 0px #000' }}>Términos y Condiciones</h1>
          <p className="nk-store-hero-subtitle" style={{ color: '#ccc' }}>Reglas de nuestra tripulación.</p>
        </div>
      </div>

      <div className="nk-container" style={{ padding: '60px 24px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', background: 'var(--nk-bg-card)', padding: '40px', border: '2px solid #000', boxShadow: 'var(--nk-manga-shadow-lg)' }}>
          <section style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '15px' }}>1. Aceptación de los Términos</h2>
            <p style={{ lineHeight: 1.6, color: 'var(--nk-text-sec)' }}>Al acceder y utilizar este sitio web, aceptas cumplir con los términos y condiciones aquí descritos. Estos términos se aplican a todos los visitantes, usuarios y otras personas que accedan o utilicen el servicio.</p>
          </section>

          <section style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '15px' }}>2. Elaboración bajo Pedido</h2>
            <p style={{ lineHeight: 1.6, color: 'var(--nk-text-sec)' }}>En Nakama Bordados, cada producto es único y se elabora específicamente tras recibir el pedido. El tiempo de producción estándar es de 7 a 15 días hábiles. Al realizar una compra, aceptas estos tiempos de espera.</p>
          </section>

          <section style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '15px' }}>3. Propiedad Intelectual</h2>
            <p style={{ lineHeight: 1.6, color: 'var(--nk-text-sec)' }}>Todos los diseños, logotipos y contenido visual son propiedad de Nakama Bordados o se utilizan bajo licencia. Queda estrictamente prohibida la reproducción parcial o total sin consentimiento previo.</p>
          </section>

          <section style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '15px' }}>4. Cambios y Devoluciones</h2>
            <p style={{ lineHeight: 1.6, color: 'var(--nk-text-sec)' }}>Debido a la naturaleza personalizada de nuestros productos, no se aceptan devoluciones por error en la elección de talla. Te invitamos a revisar nuestra Guía de Tallas antes de finalizar tu compra. Solo se realizarán cambios en caso de defectos de fabricación debidamente comprobados.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '2rem', marginBottom: '15px' }}>5. Envíos</h2>
            <p style={{ lineHeight: 1.6, color: 'var(--nk-text-sec)' }}>Nakama Bordados no se hace responsable por retrasos causados por las empresas de paquetería, desastres naturales o información de envío incorrecta proporcionada por el usuario.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
