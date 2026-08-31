'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './LuffyCharacter.module.css';

export type LuffyExpression = 'happy' | 'serious' | 'closed' | 'shocked' | 'neutral' | 'original';

export interface LuffyCharacterProps {
  expression?: LuffyExpression | null;
  isPasswordFocused?: boolean;
  className?: string;
}

const LUFFY_QUOTES = [
  '¡Seré el Rey de los Piratas! 👒',
  '¡Tengo hambre! ¿Hay carne por aquí? 🍖',
  '¡Únete a mi tripulación, nakama! ⚓',
  '¡Mis nakamas son mi mayor tesoro! ✨',
  '¡Vamos hacia una nueva aventura! ⛵',
  '¡Gomu Gomu no... Nakama! 🥊',
  '¡Kaizoku ou ni ore wa naru! 🔥',
  '¡No te rindas nunca, nakama! 🌟',
];

export default function LuffyCharacter({
  expression: externalExpression,
  isPasswordFocused = false,
  className = '',
}: LuffyCharacterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isToggledShocked, setIsToggledShocked] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [showQuote, setShowQuote] = useState(false);

  // Determinar la expresión activa según prioridad:
  // 1. Si está enfocado el campo de contraseña -> 'closed' (cierra los ojos y silba)
  // 2. Si se pasa una expresión externa (ej. 'shocked' en error) -> externalExpression
  // 3. Si se hizo clic/toggle manual de sorpresa -> 'shocked'
  // 4. Si hay hover o toque sobre el personaje -> 'serious' (como en la imagen de referencia)
  // 5. Estado inicial por defecto -> 'happy' (feliz con sonrisa)
  let activeExpression: LuffyExpression = 'happy';

  if (isPasswordFocused) {
    activeExpression = 'closed';
  } else if (externalExpression) {
    activeExpression = externalExpression;
  } else if (isToggledShocked) {
    activeExpression = 'shocked';
  } else if (isHovered) {
    activeExpression = 'serious';
  } else {
    activeExpression = 'happy';
  }

  const isInteracting = isPasswordFocused || isToggledShocked || isHovered || externalExpression === 'shocked';

  // Cuadros de diálogo con frases icónicas de Luffy que aparecen periódicamente en reposo
  useEffect(() => {
    if (isInteracting) {
      return;
    }

    let hideTimer: ReturnType<typeof setTimeout>;

    // Mostrar una frase cada 8.5 segundos durante 4 segundos
    const intervalTimer = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % LUFFY_QUOTES.length);
      setShowQuote(true);

      hideTimer = setTimeout(() => {
        setShowQuote(false);
      }, 4000);
    }, 8500);

    // Primera frase a los 3 segundos de reposo inicial
    const initialTimer = setTimeout(() => {
      setShowQuote(true);
      hideTimer = setTimeout(() => {
        setShowQuote(false);
      }, 4000);
    }, 3000);

    return () => {
      clearInterval(intervalTimer);
      clearTimeout(initialTimer);
      clearTimeout(hideTimer);
    };
  }, [isInteracting]);

  // Seguimiento dinámico del cursor con las pupilas cuando los ojos están abiertos
  useEffect(() => {
    if (activeExpression === 'closed') return;

    const handlePointerMove = (e: PointerEvent | MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height * 0.45;

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const dist = Math.hypot(dx, dy);

      if (dist === 0) return;

      const angle = Math.atan2(dy, dx);
      const maxRangeX = 22; // Rango de movimiento X: 50% +- 22% (28% a 72%)
      const maxRangeY = 16; // Rango de movimiento Y: 54% +- 16% (38% a 70%)
      const intensity = Math.min(dist / 400, 1);

      const targetX = 50 + Math.cos(angle) * maxRangeX * intensity;
      const targetY = 54 + Math.sin(angle) * maxRangeY * intensity;

      container.style.setProperty('--pupil-x', `${Math.round(targetX * 10) / 10}%`);
      container.style.setProperty('--pupil-y', `${Math.round(targetY * 10) / 10}%`);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, [activeExpression]);

  const handlePointerEnter = () => {
    setIsHovered(true);
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
  };

  const toggleShocked = () => {
    setIsToggledShocked((prev) => !prev);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleShocked();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`${styles.luffyContainer} ${className}`.trim()}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={toggleShocked}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Mascota Luffy (${activeExpression}). Haz clic o presiona Enter para interactuar.`}
      data-testid="luffy-character"
      data-expression={activeExpression}
    >
      {/* Cuadro de diálogo con frases icónicas de Luffy en reposo */}
      {showQuote && !isInteracting && (
        <div
          className={styles.speechBubble}
          role="status"
          aria-live="polite"
          data-testid="luffy-speech-bubble"
        >
          <p className={styles.speechText}>{LUFFY_QUOTES[quoteIndex]}</p>
          <div className={styles.speechTail} aria-hidden="true"></div>
        </div>
      )}

      <div
        className={`${styles.luffy} ${styles[activeExpression] || ''}`}
        aria-hidden="true"
      >
        <div className={styles.neck}></div>
        <div className={styles.hat}></div>
        <div className={styles.hair}></div>
        <div className={styles.earR}></div>
        <div className={styles.earL}></div>
        <div className={styles.face}>
          <div className={styles.eyeL}></div>
          <div className={styles.eyeR}></div>
          <div className={styles.bEye}></div>
          <div className={styles.nose}></div>
        </div>

        {/* Notas musicales flotantes cuando silba con los ojos cerrados al escribir la contraseña */}
        {activeExpression === 'closed' && (
          <div className={styles.whistleNotes} aria-hidden="true" data-testid="whistle-notes">
            <span className={styles.note1}>♪</span>
            <span className={styles.note2}>♫</span>
            <span className={styles.note3}>♬</span>
          </div>
        )}
      </div>
    </div>
  );
}
