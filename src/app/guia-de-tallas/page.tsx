'use client';

import React, { useState } from 'react';
import Image from 'next/image';

export default function SizeGuidePage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const guides = [
    { title: "Playeras", img: "https://nakamabordados.com/wp-content/uploads/2026/01/2.webp" },
    { title: "Oversize", img: "https://nakamabordados.com/wp-content/uploads/2026/01/3.webp" },
    { title: "Sudaderas", img: "https://nakamabordados.com/wp-content/uploads/2026/01/4.webp" },
    { title: "Hoodies", img: "https://nakamabordados.com/wp-content/uploads/2026/01/5.webp" },
    { title: "Acid Wash", img: "https://nakamabordados.com/wp-content/uploads/2026/01/6.webp" },
    { title: "Shorts", img: "https://nakamabordados.com/wp-content/uploads/2026/01/7.webp" },
    { title: "Cromas", img: "https://nakamabordados.com/wp-content/uploads/2026/01/8.webp" }
  ];

  return (
    <div className="nk-store-page">
      <div className="nk-store-hero" style={{ background: 'var(--nk-navy)', color: '#fff', padding: '120px 24px 80px', borderBottom: '4px solid var(--nk-primary)' }}>
        <div className="nk-container">
          <span className="nk-store-hero-badge" style={{ background: 'var(--nk-primary)', color: 'white', border: 'none' }}>Guía</span>
          <h1 className="nk-store-hero-title" style={{ color: '#fff', textShadow: '4px 4px 0px #000' }}>Guía de Tallas</h1>
          <p className="nk-store-hero-subtitle" style={{ color: '#ccc' }}>Asegúrate de que tu equipo te quede a la perfección.</p>
        </div>
      </div>

      <div className="nk-container" style={{ padding: '60px 24px' }}>
        <div className="nk-size-guide-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
          {guides.map((guide, idx) => (
            <div key={idx} className="nk-guide-card nk-manga-border" style={{ background: 'var(--nk-bg-card)', padding: '20px', boxShadow: 'var(--nk-manga-shadow)' }}>
              <h3 style={{ fontSize: '1.8rem', color: 'var(--nk-primary)', marginBottom: '15px', textAlign: 'center' }}>{guide.title}</h3>
              <div 
                style={{ position: 'relative', aspectRatio: '3/4', width: '100%', cursor: 'zoom-in' }}
                onClick={() => setSelectedImage(guide.img)}
              >
                <Image 
                  src={guide.img} 
                  alt={guide.title} 
                  fill 
                  style={{ objectFit: 'contain' }}
                  className="nk-manga-border"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Modal / Lightbox */}
        {selectedImage && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0,0,0,0.9)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              cursor: 'zoom-out'
            }}
            onClick={() => setSelectedImage(null)}
          >
            <button 
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'var(--nk-primary)',
                color: 'white',
                border: 'none',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10001
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImage(null);
              }}
            >
              <span className="material-icons-outlined">close</span>
            </button>
            <div style={{ position: 'relative', width: '100%', height: '100%', maxWidth: '1000px', maxHeight: '90vh' }}>
              <Image 
                src={selectedImage} 
                alt="Vista ampliada" 
                fill 
                style={{ objectFit: 'contain' }}
                priority
              />
            </div>
          </div>
        )}

        <div style={{ marginTop: '50px', background: '#fffbe6', padding: '30px', border: '2px solid #ffe58f', borderRadius: '8px', color: '#856404' }}>
          <h4 style={{ fontSize: '1.4rem', marginBottom: '10px' }}>💡 Pro-Tip Nakama</h4>
          <p>Nuestras tallas son estándar mexicanas. Si buscas un estilo más relajado o 'baggy', te recomendamos pedir una talla más arriba de lo habitual, especialmente en nuestras piezas bordadas.</p>
        </div>
      </div>
    </div>
  );
}
