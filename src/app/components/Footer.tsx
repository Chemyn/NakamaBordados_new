'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '../context/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();

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
              {t('footer.description')}
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
            <h4 className="nk-footer-heading">{t('nav.store')}</h4>
            <ul className="nk-footer-links">
              <li><Link href="/store">{t('nav.all')}</Link></li>
              <li><Link href="/store?category=bordados">{t('nav.embroidery')}</Link></li>
              <li><Link href="/store?category=bordado-con-estampado">{t('nav.combo')}</Link></li>
              <li><Link href="/store?category=estampados">{t('nav.prints')}</Link></li>
              <li><Link href="/store?category=gorras">{t('nav.caps')}</Link></li>
              <li><Link href="/store?category=lisas">{t('nav.plain')}</Link></li>
              <li><Link href="/store?category=variedad">{t('nav.variety')}</Link></li>
            </ul>
          </div>

          {/* Column 3: Support links */}
          <div className="nk-footer-col">
            <h4 className="nk-footer-heading">{t('footer.support')}</h4>
            <ul className="nk-footer-links">
              <li><Link href="/faq">{t('footer.faq')}</Link></li>
              <li><Link href="/guia-de-tallas">{t('footer.size_guide')}</Link></li>
            </ul>
          </div>

          {/* Column 4: Legal & Payments */}
          <div className="nk-footer-col">
            <h4 className="nk-footer-heading">{t('footer.legal')}</h4>
            <ul className="nk-footer-links">
              <li><Link href="/terminos-y-condiciones">{t('footer.terms')}</Link></li>
              <li><Link href="/aviso-de-privacidad">{t('footer.privacy')}</Link></li>
            </ul>
            <div className="nk-footer-payment-wrapper">
              <p className="nk-payment-title">{t('footer.secure_payment')}</p>
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
          <p className="nk-footer-copyright">&copy; {new Date().getFullYear()} Nakama Bordados. {t('footer.rights')}</p>
          <p className="nk-footer-developer">
            {t('footer.dev')}{' '}
            <a href="https://www.imperiodev.com/" target="_blank" rel="noopener noreferrer" className="nk-dev-link">
              IMPERIODEV
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
