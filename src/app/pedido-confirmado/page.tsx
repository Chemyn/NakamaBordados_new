'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCart } from '../context/CartContext';
import { apiOrigin } from '@/lib/api-host';
import styles from './confirmation.module.css';

interface BankAccount {
  accountName: string;
  bankName: string;
  accountNumber: string;
  iban: string;
  bic: string;
  sortCode: string;
}

interface OrderConfirmation {
  orderNumber: string;
  status: string;
  isPaid: boolean;
  total: string;
  currency: string;
  dateCreated: string;
  paymentMethod: string;
  paymentTitle: string;
  firstName: string;
  transferInstructions: string;
  bankAccounts: BankAccount[];
}

const JOURNEY = [
  {
    titlePaid: 'Pago recibido',
    titlePending: 'Pago pendiente de confirmación',
    descriptionPaid: 'Tu pago quedó registrado y el pedido ya puede avanzar.',
    descriptionPending: 'Confirmaremos la transferencia o la respuesta de la pasarela.',
    icon: 'verified',
  },
  {
    titlePaid: 'En fabricación',
    titlePending: 'En fabricación',
    descriptionPaid: 'Preparamos materiales y trabajamos tu bordado con el acabado solicitado.',
    descriptionPending: 'Al confirmar el pago, tu pedido entra a la fila de fabricación.',
    icon: 'content_cut',
  },
  {
    titlePaid: 'Preparando guía',
    titlePending: 'Preparando guía',
    descriptionPaid: 'Empacamos tu pedido y generamos la guía con la paquetería disponible.',
    descriptionPending: 'Empacaremos tu pedido y generaremos su guía de envío.',
    icon: 'inventory_2',
  },
  {
    titlePaid: 'Enviado',
    titlePending: 'Enviado',
    descriptionPaid: 'Podrás consultar la guía y seguir el recorrido hasta tu puerta.',
    descriptionPending: 'La guía aparecerá en Mi Cuenta cuando salga de nuestro taller.',
    icon: 'local_shipping',
  },
] as const;

function journeyIndex(status: string): number {
  switch (status) {
    case 'completed': return 3;
    case 'pendiente-guia': return 2;
    case 'fabricando': return 1;
    default: return 0;
  }
}

function formatTotal(total: string, currency: string): string {
  const amount = Number(total);
  if (!Number.isFinite(amount)) return total;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency || 'MXN',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Hoy';
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export default function PedidoConfirmadoPage() {
  const { clearCart } = useCart();
  const clearCartRef = useRef(clearCart);
  const [confirmation, setConfirmation] = useState<OrderConfirmation | null>(null);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    // Woo entrega la credencial en el fragmento: el navegador puede usarla,
    // pero no viaja a logs del servidor ni a los page_view de Analytics.
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const order = params.get('order');
    const key = params.get('key');

    if (!order || !key) {
      queueMicrotask(() => setError(true));
      return;
    }

    const controller = new AbortController();
    const url = `${apiOrigin()}/?rest_route=/nakama/v1/order-confirmation&order=${encodeURIComponent(order)}&key=${encodeURIComponent(key)}`;

    fetch(url, {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then(async response => {
        if (!response.ok) throw new Error('invalid-order');
        return response.json() as Promise<OrderConfirmation>;
      })
      .then(data => {
        setConfirmation(data);
        clearCartRef.current();
      })
      .catch(fetchError => {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return;
        setError(true);
      });

    return () => controller.abort();
  }, []);

  const whatsappUrl = useMemo(() => {
    if (!confirmation) return '#';
    const message = `Hola Nakama, envío el comprobante de transferencia del pedido #${confirmation.orderNumber}.`;
    return `https://wa.me/526622455087?text=${encodeURIComponent(message)}`;
  }, [confirmation]);

  const copyValue = async (value: string) => {
    if (!value || !navigator.clipboard) return;
    await navigator.clipboard.writeText(value);
    setCopied(value);
    window.setTimeout(() => setCopied(''), 1800);
  };

  if (error) {
    return (
      <main className={styles.page}>
        <section className={styles.stateCard} aria-labelledby="confirmation-error-title">
          <span className={`material-icons-outlined ${styles.stateIcon}`} aria-hidden="true">link_off</span>
          <p className={styles.eyebrow}>Enlace no disponible</p>
          <h1 id="confirmation-error-title">No pudimos mostrar tu pedido</h1>
          <p>El enlace puede estar incompleto o haber cambiado. Tus compras siguen disponibles de forma segura en Mi Cuenta.</p>
          <Link href="/mi-cuenta/" className="nk-btn">Ir a Mi Cuenta</Link>
        </section>
      </main>
    );
  }

  if (!confirmation) {
    return (
      <main className={styles.page}>
        <section className={styles.stateCard} role="status" aria-live="polite">
          <span className={styles.loader} aria-hidden="true" />
          <p className={styles.eyebrow}>Confirmando compra</p>
          <h1>Estamos preparando tu pedido</h1>
          <p>Esto tomará solo un momento.</p>
        </section>
      </main>
    );
  }

  const currentStep = journeyIndex(confirmation.status);
  const isTransfer = confirmation.paymentMethod === 'bacs';

  return (
    <main className={styles.page}>
      <div className={styles.ambient} aria-hidden="true" />
      <div className={`nk-container ${styles.container}`}>
        <section className={styles.hero} aria-labelledby="confirmation-title">
          <div className={styles.successMark} aria-hidden="true">
            <span className="material-icons-outlined">check</span>
          </div>
          <div>
            <p className={styles.eyebrow}>Compra confirmada</p>
            <h1 id="confirmation-title">Tu pedido ya está en marcha</h1>
            <p className={styles.lead}>
              {confirmation.firstName ? `Gracias, ${confirmation.firstName}. ` : 'Gracias. '}
              Recibimos tu pedido y te acompañaremos hasta que llegue a tus manos.
            </p>
          </div>
          <span className={styles.orderChip}>Pedido #{confirmation.orderNumber}</span>
        </section>

        <section className={styles.summary} aria-label="Resumen del pedido">
          <div>
            <span>Pedido</span>
            <strong>#{confirmation.orderNumber}</strong>
          </div>
          <div>
            <span>Fecha</span>
            <strong>{formatDate(confirmation.dateCreated)}</strong>
          </div>
          <div>
            <span>Total</span>
            <strong className={styles.total}>{formatTotal(confirmation.total, confirmation.currency)}</strong>
          </div>
          <div>
            <span>Método</span>
            <strong>{confirmation.paymentTitle || 'Pago en línea'}</strong>
          </div>
        </section>

        {isTransfer && (
          <section className={styles.transferCard} aria-labelledby="transfer-title">
            <div className={styles.sectionHeading}>
              <span className={`material-icons-outlined ${styles.sectionIcon}`} aria-hidden="true">account_balance</span>
              <div>
                <p className={styles.eyebrow}>Siguiente acción</p>
                <h2 id="transfer-title">Completa tu transferencia</h2>
                <p>{confirmation.transferInstructions || 'Usa tu número de pedido como referencia para que podamos identificar el pago.'}</p>
              </div>
            </div>

            <div className={styles.accounts}>
              {confirmation.bankAccounts.map((account, index) => (
                <article className={styles.account} key={`${account.bankName}-${index}`}>
                  <div className={styles.accountTitle}>
                    <span>Cuenta {confirmation.bankAccounts.length > 1 ? index + 1 : 'bancaria'}</span>
                    <strong>{account.bankName}</strong>
                  </div>
                  <dl>
                    {account.accountName && <><dt>Titular</dt><dd>{account.accountName}</dd></>}
                    {account.accountNumber && (
                      <>
                        <dt>Cuenta / CLABE</dt>
                        <dd className={styles.copyRow}>
                          <span>{account.accountNumber}</span>
                          <button type="button" onClick={() => copyValue(account.accountNumber)} aria-label="Copiar cuenta o CLABE">
                            <span className="material-icons-outlined" aria-hidden="true">{copied === account.accountNumber ? 'check' : 'content_copy'}</span>
                          </button>
                        </dd>
                      </>
                    )}
                    {account.iban && <><dt>IBAN</dt><dd>{account.iban}</dd></>}
                    {account.bic && <><dt>BIC / SWIFT</dt><dd>{account.bic}</dd></>}
                    {account.sortCode && <><dt>Sucursal</dt><dd>{account.sortCode}</dd></>}
                  </dl>
                </article>
              ))}
            </div>

            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={styles.whatsappButton}>
              <i className="fa-brands fa-whatsapp" aria-hidden="true" />
              Enviar comprobante por WhatsApp
            </a>
          </section>
        )}

        <section className={styles.journeyCard} aria-labelledby="journey-title">
          <div className={styles.sectionHeading}>
            <span className={`material-icons-outlined ${styles.sectionIcon}`} aria-hidden="true">route</span>
            <div>
              <p className={styles.eyebrow}>Lo que sigue</p>
              <h2 id="journey-title">Así preparamos tu pedido</h2>
              <p>Cada pieza pasa por un proceso cuidadoso antes de salir de nuestro taller.</p>
            </div>
          </div>

          <ol className={styles.journey} aria-label="Etapas de tu pedido">
            {JOURNEY.map((step, index) => {
              const state = index < currentStep ? 'done' : index === currentStep ? 'current' : 'upcoming';
              const title = index === 0 && !confirmation.isPaid ? step.titlePending : step.titlePaid;
              const description = confirmation.isPaid ? step.descriptionPaid : step.descriptionPending;
              return (
                <li className={`${styles.step} ${styles[state]}`} key={step.titlePaid}>
                  <div className={styles.stepRail} aria-hidden="true">
                    <span className={styles.stepMark}>
                      <span className="material-icons-outlined">{state === 'done' ? 'check' : step.icon}</span>
                    </span>
                  </div>
                  <div>
                    <span className={styles.stepNumber}>Paso {index + 1}</span>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section className={styles.trackingCard} aria-labelledby="tracking-title">
          <span className={`material-icons-outlined ${styles.trackingIcon}`} aria-hidden="true">travel_explore</span>
          <div>
            <h2 id="tracking-title">Tu seguimiento vive en Mi Cuenta</h2>
            <p>Ahí verás el estado actualizado y, cuando esté disponible, el número de guía de tu paquete.</p>
          </div>
          <Link href="/mi-cuenta/" className={styles.accountLink}>Ver seguimiento en Mi Cuenta</Link>
        </section>

        <nav className={styles.actions} aria-label="Opciones después de comprar">
          <Link href="/store/" className="nk-btn">Seguir comprando</Link>
          <Link href="/" className={styles.secondaryButton}>Volver al inicio</Link>
        </nav>
      </div>
    </main>
  );
}
