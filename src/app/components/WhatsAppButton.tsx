'use client';

import React from 'react';

export default function WhatsAppButton() {
  const phoneNumber = '521XXXXXXXXXX'; // Reemplazar con el número real de Nakama
  const message = 'Hola, me gustaría recibir soporte con mi compra en Nakama Bordados.';
  
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  return (
    <a 
      href={whatsappUrl} 
      target="_blank" 
      rel="noopener noreferrer"
      className="nk-whatsapp-btn"
      title="Soporte por WhatsApp"
    >
      <i className="fa-brands fa-whatsapp"></i>
    </a>
  );
}
