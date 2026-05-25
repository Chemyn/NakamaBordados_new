'use client';

import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="nk-footer">
      <div className="nk-footer-container">
        <div className="nk-footer-grid">
          {/* Column 1: Brand details */}
          <div className="nk-footer-col nk-footer-brand-col">
            <Link href="/" className="nk-footer-logo-link">
              <img 
                src="https://nakamabordados.com/wp-content/uploads/2025/11/LOGO-NAKAMA-scaled-2048x926.png" 
                alt="Nakama Logo" 
                className="nk-footer-logo-img"
              />
            </Link>
            <p className="nk-footer-description">
              El puente entre la cultura anime y el streetwear de alta gama.
            </p>
            <div className="nk-footer-socials">
              <a href="https://www.instagram.com/nakama_bordados/" target="_blank" rel="noopener noreferrer" className="nk-social-link">
                <i className="fa-brands fa-instagram"></i>
              </a>
              <a href="https://www.tiktok.com/@nakamabordados" target="_blank" rel="noopener noreferrer" className="nk-social-link">
                <i className="fa-brands fa-tiktok"></i>
              </a>
              <a href="https://www.facebook.com/Nakamabordados" target="_blank" rel="noopener noreferrer" className="nk-social-link">
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
              <li><a href="#preguntas-frecuentes">Preguntas Frecuentes</a></li>
              <li><a href="#guia-tallas">Guía de Tallas</a></li>
              <li>
                <a 
                  href="https://wa.me/526622455087?text=%C2%A1Oi%20Nakama!%20Necesito%20tu%20ayuda%20con%20algo...%20%C2%BFtienes%20un%20momento?" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Contáctanos (WhatsApp)
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Legal & Payments */}
          <div className="nk-footer-col">
            <h4 className="nk-footer-heading">Legal</h4>
            <ul className="nk-footer-links">
              <li><a href="#terminos">Términos y Condiciones</a></li>
              <li><a href="#aviso-privacidad">Aviso de Privacidad</a></li>
            </ul>
            <div className="nk-footer-payment-wrapper">
              <p className="nk-payment-title">Pago Seguro</p>
              <div className="nk-payment-icons">
                <img src="https://nakamabordados.com/wp-content/uploads/2026/01/visa.avif" alt="Visa" className="nk-payment-img" />
                <img src="https://nakamabordados.com/wp-content/uploads/2026/01/mastercard.avif" alt="Mastercard" className="nk-payment-img" />
                <img src="https://nakamabordados.com/wp-content/uploads/2026/01/amex.avif" alt="Amex" className="nk-payment-img" />
                <img src="https://nakamabordados.com/wp-content/uploads/2026/01/paypal.avif" alt="Paypal" className="nk-payment-img" />
                <img src="https://nakamabordados.com/wp-content/uploads/2026/01/oxxo.avif" alt="Oxxo" className="nk-payment-img" />
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
