"use client";

import React from 'react';

export const Marquee: React.FC = () => {
  const announcements = [
    "DESCUENTO DE BIENVENIDA EN TU 1°, 2° Y 3° COMPRA",
    "ENVÍO GRATIS A PARTIR DE $1,500",
    "3 MSI A PARTIR DE $2,000",
    "3% DE DESCUENTO POR TRANSFERENCIA"
  ];

  // Repeat twice to ensure seamless scrolling
  const marqueeText = [...announcements, ...announcements];

  return (
    <div className="marquee-container shadow-lg border-bottom border-top border-dark">
      <div className="marquee-content d-flex gap-5">
        {marqueeText.map((text, idx) => (
          <React.Fragment key={idx}>
            <span className="text-black font-display font-bold uppercase tracking-widest">•</span>
            <span className="text-black font-display font-bold uppercase tracking-widest">{text}</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
export default Marquee;
