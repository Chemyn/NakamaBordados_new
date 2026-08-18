export interface AccountProgressStep {
  key: string;
  label: string;
  icon: string;
}

interface AccountProgressProps {
  steps: readonly AccountProgressStep[];
  currentIndex: number;
  label: string;
  hasProblem?: boolean;
}

export default function AccountProgress({
  steps,
  currentIndex,
  label,
  hasProblem = false,
}: AccountProgressProps) {
  return (
    <>
    <ol className="nk-account-progress" aria-label={label}>
      {steps.map((step, index) => {
        const reached = index <= currentIndex;
        const current = index === currentIndex;
        const problem = current && hasProblem;
        const accessibleState = current
          ? problem ? ', paso actual, requiere atención' : ', paso actual'
          : reached ? ', completado' : ', pendiente';

        return (
          <li
            key={step.key}
            className={`nk-account-progress-step${reached ? ' is-done' : ''}${current ? ' is-current' : ''}${problem ? ' is-problem' : ''}`}
            aria-current={current ? 'step' : undefined}
            aria-label={`${step.label}${accessibleState}`}
          >
            <span className="nk-account-progress-marker" aria-hidden="true">
              <span className="material-icons-outlined">{problem ? 'error_outline' : step.icon}</span>
            </span>
            <span className="nk-account-progress-label">{step.label}</span>
            {current && (
              <span className="nk-account-progress-state">
                {problem ? 'Requiere atención' : 'Paso actual'}
              </span>
            )}
          </li>
        );
      })}
    </ol>
      <style jsx>{`
        .nk-account-progress {
          list-style: none;
          margin: 18px 0 8px;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .nk-account-progress-step {
          min-height: 54px;
          display: grid;
          grid-template-columns: 40px minmax(0, 1fr);
          grid-template-rows: auto auto;
          align-items: center;
          column-gap: 12px;
          position: relative;
          color: var(--nk-text-sec);
        }

        .nk-account-progress-step:not(:first-child)::before {
          content: '';
          position: absolute;
          left: 18px;
          bottom: calc(50% + 19px);
          height: 24px;
          border-left: 3px dashed var(--nk-border);
        }

        .nk-account-progress-step.is-done:not(:first-child)::before {
          border-color: var(--nk-primary);
        }

        .nk-account-progress-marker {
          grid-row: 1 / 3;
          width: 38px;
          height: 38px;
          border: 2px solid var(--nk-border);
          border-radius: 50%;
          background: var(--nk-bg-card);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 1;
        }

        .nk-account-progress-marker .material-icons-outlined {
          font-size: 19px;
        }

        .nk-account-progress-step.is-done .nk-account-progress-marker {
          border-color: var(--nk-primary);
          background: var(--nk-primary);
          color: var(--nk-bg-body);
        }

        .nk-account-progress-step.is-current .nk-account-progress-marker {
          outline: 3px solid color-mix(in srgb, var(--nk-primary) 30%, transparent);
          outline-offset: 2px;
        }

        .nk-account-progress-step.is-problem .nk-account-progress-marker {
          border-color: #c83232;
          background: #c83232;
          color: #fff;
        }

        .nk-account-progress-label {
          align-self: end;
          font-size: 0.875rem;
          font-weight: 800;
          line-height: 1.35;
          text-transform: uppercase;
          overflow-wrap: anywhere;
        }

        .nk-account-progress-state {
          align-self: start;
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--nk-primary);
        }

        .is-problem .nk-account-progress-state {
          color: #c83232;
        }

        @media (min-width: 600px) {
          .nk-account-progress {
            flex-direction: row;
            gap: 0;
            margin-bottom: 18px;
          }

          .nk-account-progress-step {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 6px;
            text-align: center;
          }

          .nk-account-progress-step:not(:first-child)::before {
            left: auto;
            right: 50%;
            bottom: auto;
            top: 18px;
            width: 100%;
            height: 0;
            border-left: 0;
            border-top: 3px dashed var(--nk-border);
          }

          .nk-account-progress-step.is-done:not(:first-child)::before {
            border-top-color: var(--nk-primary);
          }

          .nk-account-progress-label {
            align-self: auto;
            max-width: 110px;
            min-height: 38px;
          }

          .nk-account-progress-state {
            align-self: auto;
          }
        }
      `}</style>
    </>
  );
}
