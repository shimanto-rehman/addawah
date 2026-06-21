'use client';

import type { ReactNode } from 'react';

type OtpFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  showTick?: boolean;
  hint?: string;
  hintVariant?: 'info' | 'error';
  labelAside?: ReactNode;
};

export function OtpField({
  id,
  label,
  value,
  onChange,
  required,
  showTick,
  hint,
  hintVariant = 'info',
  labelAside,
}: OtpFieldProps) {
  return (
    <div className="dawa-field dawa-validated-field dawa-reset-otp-field">
      {labelAside ? (
        <div className="dawa-auth__label-row">
          <label className="dawa-label" htmlFor={id}>
            {label}
            {required && <span className="dawa-label__req" aria-hidden> *</span>}
          </label>
          {labelAside}
        </div>
      ) : (
        <label className="dawa-label" htmlFor={id}>
          {label}
          {required && <span className="dawa-label__req" aria-hidden> *</span>}
        </label>
      )}

      <div className="dawa-validated-field__wrap">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          className={`dawa-input dawa-reset-otp-field__input${showTick ? ' is-valid' : ''}`}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          autoComplete="one-time-code"
          required={required}
          aria-invalid={hintVariant === 'error' ? true : undefined}
          aria-describedby={hint ? `${id}-hint` : undefined}
        />
        {showTick && (
          <span className="dawa-validated-field__tick" aria-label="Valid">
            <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor" aria-hidden>
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414 0l-4-4a1 1 0 1 1 1.414-1.414L8 12.586l7.293-7.293a1 1 0 0 1 1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        )}
      </div>

      {hint && (
        <p
          id={`${id}-hint`}
          className={`dawa-validated-field__hint${hintVariant === 'error' ? ' is-error' : ''}`}
          role={hintVariant === 'error' ? 'alert' : undefined}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
