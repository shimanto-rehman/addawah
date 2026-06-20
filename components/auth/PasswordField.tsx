'use client';

import { useState } from 'react';

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  showTick?: boolean;
  hint?: string;
  hintVariant?: 'info' | 'error';
  labelAside?: React.ReactNode;
  minLength?: number;
  name?: string;
};

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-8-10-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M1 1l22 22" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    </svg>
  );
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder = '••••••••',
  autoComplete,
  required,
  showTick,
  hint,
  hintVariant = 'info',
  labelAside,
  minLength,
  name,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  const wrapClass = [
    'dawa-validated-field__wrap',
    'dawa-validated-field__wrap--password',
    showTick ? 'has-tick' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="dawa-field dawa-validated-field">
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

      <div className={wrapClass}>
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          className={`dawa-input${showTick ? ' is-valid' : ''}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onInput={(e) => onChange(e.currentTarget.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          aria-invalid={hintVariant === 'error' ? true : undefined}
          aria-describedby={hint ? `${id}-hint` : undefined}
        />

        <button
          type="button"
          className="dawa-validated-field__toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          tabIndex={0}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>

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
