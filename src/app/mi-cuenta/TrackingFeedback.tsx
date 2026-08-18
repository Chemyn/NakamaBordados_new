import type { ReactNode } from 'react';

interface TrackingFeedbackProps {
  error: string;
  loading: boolean;
  onRetry: () => void;
  children?: ReactNode;
}

export default function TrackingFeedback({
  error,
  loading,
  onRetry,
  children,
}: TrackingFeedbackProps) {
  return (
    <>
      {loading && (
        <p className="nk-tracking-update-status" role="status">
          <span className="nk-spinner nk-spinner-inline" aria-hidden="true" />
          Actualizando rastreo…
        </p>
      )}

      {error && (
        <div className="nk-tracking-error" role="alert">
          <span className="material-icons-outlined" aria-hidden="true">sync_problem</span>
          <div>
            <p>{error}</p>
            <button type="button" className="nk-account-secondary-action" onClick={onRetry}>
              Reintentar rastreo
            </button>
          </div>
        </div>
      )}

      {children}

      <style jsx>{`
        .nk-tracking-update-status,
        .nk-tracking-error {
          margin: 0 0 16px;
          font-size: 1rem;
          line-height: 1.5;
        }

        .nk-tracking-update-status {
          min-height: 44px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          color: var(--nk-text-sec);
        }

        .nk-spinner-inline {
          width: 22px;
          height: 22px;
          flex: 0 0 22px;
        }

        .nk-tracking-error {
          display: grid;
          grid-template-columns: 28px minmax(0, 1fr);
          gap: 10px;
          padding: 14px;
          border: 2px solid #c83232;
          background: var(--nk-bg-card);
          color: var(--nk-text-main);
        }

        .nk-tracking-error > .material-icons-outlined {
          color: #c83232;
        }

        .nk-tracking-error p {
          margin: 0 0 10px;
          font-weight: 700;
        }

        .nk-account-secondary-action {
          min-height: 44px;
          padding: 8px 16px;
          border: 2px solid var(--nk-border);
          background: var(--nk-bg-card);
          color: var(--nk-text-main);
          font-family: 'Teko', sans-serif;
          font-size: 1.1rem;
          font-weight: 700;
          text-transform: uppercase;
          cursor: pointer;
        }

        .nk-account-secondary-action:hover {
          border-color: var(--nk-primary);
          color: var(--nk-primary);
        }

        .nk-account-secondary-action:focus-visible {
          outline: 3px solid var(--nk-primary);
          outline-offset: 3px;
        }
      `}</style>
    </>
  );
}
