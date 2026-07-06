'use client';

import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

/**
 * Leyenda "ENVÍO GRATIS*" que acompaña a todos los productos. Al pasar el
 * mouse (o tocarla en móvil) despliega la explicación de la promoción:
 * compras desde $1,500 MXN con guía cubierta hasta $140 MXN.
 *
 * preventDefault/stopPropagation: en las tarjetas del slider el badge vive
 * DENTRO de un <Link>; el toque debe abrir el tooltip, no navegar.
 */
export default function FreeShippingBadge({ style }: { style?: React.CSSProperties }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <span
      className={`nk-fs-badge-wrap ${open ? 'open' : ''}`}
      style={style}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOpen(o => !o);
      }}
      onMouseLeave={() => setOpen(false)}
    >
      <span className="nk-fs-badge">
        <span className="material-icons-outlined" aria-hidden="true">local_shipping</span>
        {t('product.free_shipping_badge')}
      </span>
      <span className="nk-fs-tooltip" role="tooltip">
        {t('product.free_shipping_tip')}
      </span>
    </span>
  );
}
