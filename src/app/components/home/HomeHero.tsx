import React, { useState, useEffect } from 'react';
import Image from 'next/image';

const heroSlides = [
  "https://nakamabordados.com/wp-content/uploads/2026/05/hsale1.avif",
  "https://nakamabordados.com/wp-content/uploads/2026/05/hsale2.avif",
  "https://nakamabordados.com/wp-content/uploads/2026/05/hsale3.avif"
];

export default function HomeHero() {
  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHeroSlide((prev) => (prev + 1) % heroSlides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="nk-hero-slider" id="hero-slider" style={{ aspectRatio: '16/9', minHeight: '300px' }}>
      {heroSlides.map((slide, index) => (
        <div key={index} className={`nk-hero-slide ${index === currentHeroSlide ? 'nk-hero-slide--active' : ''}`} style={{ height: '100%' }}>
          <Image 
            src={slide} 
            alt={`Promoción ${index + 1}`} 
            fill
            priority={index === 0}
            style={{ objectFit: 'cover' }}
            sizes="100vw"
          />
        </div>
      ))}
      <div className="nk-hero-scroll-hint force-white-always">
        <span className="material-icons-outlined">keyboard_arrow_down</span>
      </div>
    </section>
  );
}
