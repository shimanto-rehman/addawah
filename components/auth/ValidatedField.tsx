'use client';

type ValidatedFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  showTick?: boolean;
  hint?: string;
  hintVariant?: 'info' | 'error';
  prefix?: string;
  name?: string;
  sanitize?: (value: string) => string;
};

export function ValidatedField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  autoComplete,
  required,
  showTick,
  hint,
  hintVariant = 'info',
  prefix,
  name,
  sanitize,
}: ValidatedFieldProps) {
  function handleChange(next: string) {
    onChange(sanitize ? sanitize(next) : next);
  }

  function handleInput(e: React.FormEvent<HTMLInputElement>) {
    handleChange(e.currentTarget.value);
  }

  return (
    <div className="dawa-field dawa-validated-field">
      <label className="dawa-label" htmlFor={id}>
        {label}
        {required && <span className="dawa-label__req" aria-hidden> *</span>}
      </label>

      <div className={`dawa-validated-field__wrap${prefix ? ' dawa-validated-field__wrap--prefix' : ''}`}>
        {prefix && <span className="dawa-validated-field__prefix" aria-hidden>{prefix}</span>}
        <input
          id={id}
          name={name}
          type={type}
          className={`dawa-input${showTick ? ' is-valid' : ''}`}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onInput={handleInput}
          placeholder={placeholder}
          autoComplete={autoComplete}
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
