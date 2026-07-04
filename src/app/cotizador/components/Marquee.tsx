"use client";

import React from 'react';

export const Marquee: React.FC = () => {
  const announcements = [
    "3 MSI A PARTIR DE $500 MXN",
    "ENVÍO GRATIS EN 4PZ AL PAGAR POR TRANSFERENCIA",
    "PIEZAS LIMITADAS",
    "ENVÍOS A TODO MÉXICO",
    "NAKAMA CUSTOMS LAB"
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
