'use client';

import React, { useEffect, useId, useRef, useState } from 'react';

interface QuotePaymentDialogProps {
  folio: string;
  total: number;
  currency: string;
  isInCart: boolean;
  onClose: () => void;
  onPayNow: () => Promise<void>;
  onAddToCart: () => void;
}

export default function QuotePaymentDialog({
  folio,
  total,
  currency,
  isInCart,
  onClose,
  onPayNow,
  onAddToCart,
}: QuotePaymentDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const payButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [isStartingPayment, setIsStartingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    const returnFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    if (dialog && !dialog.open) {
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
    }
    payButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog?.open && typeof dialog.close === 'function') {
        dialog.close();
      }
      returnFocus?.focus();
    };
  }, []);

  const handlePayNow = async () => {
    setPaymentError('');
    setIsStartingPayment(true);
    try {
      await onPayNow();
    } catch {
      setPaymentError('No pudimos iniciar el pago. Verifica tu sesión e inténtalo de nuevo.');
      setIsStartingPayment(false);
    }
  };

  const handleAddToCart = () => {
    onAddToCart();
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="nk-quote-payment-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={isStartingPayment}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="nk-quote-payment-panel nk-manga-border">
        <header className="nk-quote-payment-header">
          <div>
            <span className="nk-quote-payment-kicker">COTIZACIÓN LISTA</span>
            <h2 id={titleId}>Elige cómo pagar</h2>
          </div>
          <button
            type="button"
            className="nk-quote-payment-close"
            aria-label="Cerrar opciones de pago"
            onClick={onClose}
          >
            <span className="material-icons-outlined" aria-hidden="true">close</span>
          </button>
        </header>

        <div className="nk-quote-payment-summary" aria-label={`Cotización ${folio}`}>
          <span>{folio}</span>
          <strong>
            ${total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
          </strong>
        </div>

        <p id={descriptionId} className="nk-quote-payment-intro">
          Puedes pagar únicamente este folio o guardarlo en tu carrito para combinarlo con otros artículos.
        </p>

        <div className="nk-quote-payment-options">
          <button
            ref={payButtonRef}
            type="button"
            className="nk-quote-payment-option nk-quote-payment-option-primary"
            disabled={isStartingPayment}
            onClick={handlePayNow}
          >
            <span className="material-icons-outlined" aria-hidden="true">payments</span>
            <span>
              <strong>{isStartingPayment ? 'PREPARANDO PAGO…' : 'PAGAR SOLO ESTA COTIZACIÓN'}</strong>
              <small>Continúa al checkout únicamente con este folio.</small>
            </span>
          </button>

          <button
            type="button"
            className="nk-quote-payment-option nk-quote-payment-option-secondary"
            disabled={isInCart || isStartingPayment}
            onClick={handleAddToCart}
          >
            <span className="material-icons-outlined" aria-hidden="true">
              {isInCart ? 'check' : 'add_shopping_cart'}
            </span>
            <span>
              <strong>{isInCart ? 'YA ESTÁ EN EL CARRITO' : 'AGREGAR AL CARRITO'}</strong>
              <small>{isInCart ? 'Puedes cerrar y continuar desde tu carrito.' : 'Combínala con productos u otras cotizaciones.'}</small>
            </span>
          </button>
        </div>

        {paymentError && <p className="nk-quote-payment-error" role="alert">{paymentError}</p>}

        <button type="button" className="nk-quote-payment-cancel" onClick={onClose}>
          Volver a mis pedidos
        </button>
      </div>

      <style jsx>{`
        .nk-quote-payment-dialog {
          width: min(620px, calc(100vw - 24px));
          max-width: none;
          margin: auto;
          padding: 0;
          border: 0;
          background: transparent;
          color: var(--nk-text-main);
          overflow: visible;
        }

        .nk-quote-payment-dialog::backdrop {
          background: rgba(0, 0, 0, 0.72);
          backdrop-filter: blur(3px);
        }

        .nk-quote-payment-panel {
          background: var(--nk-bg-card);
          border: 3px solid var(--nk-border);
          box-shadow: 10px 10px 0 var(--nk-border);
          padding: clamp(20px, 5vw, 32px);
          animation: nk-quote-dialog-in 180ms ease-out;
        }

        .nk-quote-payment-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding-bottom: 16px;
          border-bottom: 3px solid var(--nk-border);
        }

        .nk-quote-payment-kicker {
          display: block;
          color: var(--nk-primary);
          font-size: 0.78rem;
          font-weight: 900;
          letter-spacing: 0.16em;
        }

        h2 {
          margin: 2px 0 0;
          color: var(--nk-text-main);
          font-family: 'Teko', sans-serif;
          font-size: clamp(2rem, 8vw, 2.8rem);
          line-height: 0.95;
          text-transform: uppercase;
        }

        .nk-quote-payment-close {
          width: 44px;
          height: 44px;
          flex: 0 0 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 2px solid var(--nk-border);
          background: var(--nk-bg-wrapper);
          color: var(--nk-text-main);
          cursor: pointer;
        }

        .nk-quote-payment-summary {
          margin: 18px 0 0;
          padding: 12px 14px;
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          gap: 8px 20px;
          background: var(--nk-bg-wrapper);
          border-left: 5px solid var(--nk-primary);
          font-weight: 900;
        }

        .nk-quote-payment-summary span {
          color: var(--nk-primary);
          letter-spacing: 0.08em;
        }

        .nk-quote-payment-intro {
          margin: 16px 0;
          color: var(--nk-text-sec);
          font-size: 1rem;
          font-weight: 650;
          line-height: 1.5;
        }

        .nk-quote-payment-options {
          display: grid;
          gap: 10px;
        }

        .nk-quote-payment-option {
          width: 100%;
          min-height: 72px;
          padding: 14px;
          display: grid;
          grid-template-columns: 32px minmax(0, 1fr);
          align-items: center;
          gap: 10px;
          border: 3px solid var(--nk-border);
          font: inherit;
          text-align: left;
          cursor: pointer;
          transition: color 180ms ease, background-color 180ms ease, border-color 180ms ease;
        }

        .nk-quote-payment-option .material-icons-outlined {
          font-size: 26px;
        }

        .nk-quote-payment-option strong,
        .nk-quote-payment-option small {
          display: block;
        }

        .nk-quote-payment-option strong {
          font-family: 'Teko', sans-serif;
          font-size: 1.25rem;
          line-height: 1;
          letter-spacing: 0.02em;
        }

        .nk-quote-payment-option small {
          margin-top: 5px;
          font-size: 0.84rem;
          font-weight: 650;
          line-height: 1.35;
        }

        .nk-quote-payment-option-primary {
          background: var(--nk-primary);
          color: #fff;
        }

        .nk-quote-payment-option-primary:hover:not(:disabled) {
          background: var(--nk-text-main);
        }

        .nk-quote-payment-option-secondary {
          background: var(--nk-bg-card);
          color: var(--nk-text-main);
        }

        .nk-quote-payment-option-secondary:hover:not(:disabled) {
          border-color: var(--nk-primary);
          color: var(--nk-primary);
        }

        .nk-quote-payment-option:disabled {
          opacity: 0.62;
          cursor: not-allowed;
        }

        .nk-quote-payment-error {
          margin: 12px 0 0;
          padding: 10px 12px;
          border: 2px solid var(--nk-danger);
          background: var(--nk-bg-wrapper);
          color: var(--nk-text-main);
          font-weight: 750;
          line-height: 1.4;
        }

        .nk-quote-payment-cancel {
          min-height: 44px;
          margin: 14px auto 0;
          padding: 8px 14px;
          display: block;
          border: 0;
          background: transparent;
          color: var(--nk-text-sec);
          font-weight: 800;
          text-decoration: underline;
          text-underline-offset: 3px;
          cursor: pointer;
        }

        .nk-quote-payment-dialog button:focus-visible {
          outline: 3px solid var(--nk-accent);
          outline-offset: 3px;
        }

        @keyframes nk-quote-dialog-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .nk-quote-payment-panel { animation: none; }
          .nk-quote-payment-option { transition: none; }
        }
      `}</style>
    </dialog>
  );
}

