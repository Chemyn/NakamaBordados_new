'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="nk-footer nk-manga-border" style={{ borderLeft: 'none', borderRight: 'none', borderBottom: 'none' }}>
      <div className="nk-footer-container">
        <div className="nk-footer-grid">
          {/* Column 1: Brand details */}
          <div className="nk-footer-col nk-footer-brand-col">
            <Link href="/" className="nk-footer-logo-link">
              <Image 
                src="https://nakamabordados.com/wp-content/uploads/2025/11/LOGO-NAKAMA-scaled-2048x926.png" 
                alt="Nakama Logo" 
                width={110}
                height={50}
                className="nk-logo-img"
                style={{ height: '50px', width: 'auto' }}
              />
            </Link>
            <p className="nk-footer-description" style={{ fontFamily: 'Inter', fontWeight: 600 }}>
              Forjando el equipo de los próximos Reyes de los Piratas. Streetwear anime de alta densidad.
            </p>
            <div className="nk-footer-socials">
              <a href="https://www.instagram.com/nakama_bordados/" target="_blank" rel="noopener noreferrer" className="nk-social-link nk-manga-border" style={{ boxShadow: '2px 2px 0px #000' }}>
                <i className="fa-brands fa-instagram"></i>
              </a>
              <a href="https://www.tiktok.com/@nakamabordados" target="_blank" rel="noopener noreferrer" className="nk-social-link nk-manga-border" style={{ boxShadow: '2px 2px 0px #000' }}>
                <i className="fa-brands fa-tiktok"></i>
              </a>
              <a href="https://www.facebook.com/Nakamabordados" target="_blank" rel="noopener noreferrer" className="nk-social-link nk-manga-border" style={{ boxShadow: '2px 2px 0px #000' }}>
                <i className="fa-brands fa-facebook-f"></i>
              </a>
            </div>
          </div>

          {/* Column 2: Store categories */}
          <div className="nk-footer-col">
            <h4 className="nk-footer-heading">Tienda</h4>
            <ul className="nk-footer-links">
              <li><Link href="/store">Todas</Link></li>
              <li><Link href="/store?category=bordados">Bordados</Link></li>
              <li><Link href="/store?category=bordado-con-estampado">Bordado con Estampado</Link></li>
              <li><Link href="/store?category=estampados">Estampado</Link></li>
              <li><Link href="/store?category=gorras">Gorras</Link></li>
              <li><Link href="/store?category=lisas">Lisas</Link></li>
              <li><Link href="/store?category=variedad">Variedad</Link></li>
            </ul>
          </div>

          {/* Column 3: Support links */}
          <div className="nk-footer-col">
            <h4 className="nk-footer-heading">Soporte</h4>
            <ul className="nk-footer-links">
              <li><Link href="/faq">Preguntas Frecuentes</Link></li>
              <li><Link href="/guia-de-tallas">Guía de Tallas</Link></li>
            </ul>
          </div>

          {/* Column 4: Legal & Payments */}
          <div className="nk-footer-col">
            <h4 className="nk-footer-heading">Legal</h4>
            <ul className="nk-footer-links">
              <li><Link href="/terminos-y-condiciones">Términos y Condiciones</Link></li>
              <li><Link href="/aviso-de-privacidad">Aviso de Privacidad</Link></li>
            </ul>
            <div className="nk-footer-payment-wrapper">
              <p className="nk-payment-title">Pago Seguro</p>
              <div className="nk-payment-icons">
                <Image src="https://nakamabordados.com/wp-content/uploads/2026/01/visa.avif" alt="Visa" width={40} height={25} className="nk-payment-img" />
                <Image src="https://nakamabordados.com/wp-content/uploads/2026/01/mastercard.avif" alt="Mastercard" width={40} height={25} className="nk-payment-img" />
                <Image src="https://nakamabordados.com/wp-content/uploads/2026/01/amex.avif" alt="Amex" width={40} height={25} className="nk-payment-img" />
                <Image src="https://nakamabordados.com/wp-content/uploads/2026/01/paypal.avif" alt="Paypal" width={40} height={25} className="nk-payment-img" />
                <Image src="https://nakamabordados.com/wp-content/uploads/2026/01/oxxo.avif" alt="Oxxo" width={40} height={25} className="nk-payment-img" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Credits */}
        <div className="nk-footer-bottom">
          <p className="nk-footer-copyright">&copy; {new Date().getFullYear()} Nakama Bordados. Todos los derechos reservados.</p>
          <p className="nk-footer-developer">
            Diseño y Desarrollo{' '}
            <a href="https://www.imperiodev.com/" target="_blank" rel="noopener noreferrer" className="nk-dev-link">
              IMPERIODEV
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
