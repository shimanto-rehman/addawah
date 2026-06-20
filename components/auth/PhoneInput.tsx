'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_DIGITS_PER_ROW,
  PHONE_COUNTRIES,
  type CountryPhone,
  buildE164,
  emptyDigits,
  flagEmoji,
  isValidMobileForCountry,
  parseE164,
} from '@/lib/phone-countries';

type PhoneInputProps = {
  value: string;
  onChange: (e164: string) => void;
  required?: boolean;
  id?: string;
  label?: string;
  showTick?: boolean;
  hintMessage?: string;
  hintVariant?: 'info' | 'error';
};

export function PhoneInput({
  value,
  onChange,
  required,
  id,
  label = 'Mobile number',
  showTick,
  hintMessage,
  hintVariant = 'info',
}: PhoneInputProps) {
  const listId = useId();
  const [country, setCountry] = useState<CountryPhone>(DEFAULT_PHONE_COUNTRY);
  const [digits, setDigits] = useState<string[]>(() => emptyDigits(DEFAULT_PHONE_COUNTRY));
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value) return;
    const parsed = parseE164(value);
    if (parsed) {
      setCountry(parsed.country);
      setDigits(parsed.digits);
    }
  }, [value]);

  const emitChange = useCallback(
    (nextCountry: CountryPhone, nextDigits: string[]) => {
      if (isValidMobileForCountry(nextCountry, nextDigits)) {
        onChange(buildE164(nextCountry, nextDigits));
      } else {
        onChange('');
      }
    },
    [onChange],
  );

  function selectCountry(next: CountryPhone) {
    const nextDigits = emptyDigits(next);
    setCountry(next);
    setDigits(nextDigits);
    refs.current = [];
    setOpen(false);
    setSearch('');
    emitChange(next, nextDigits);
    requestAnimationFrame(() => refs.current[0]?.focus());
  }

  function updateDigit(index: number, raw: string) {
    const cleaned = raw.replace(/\D/g, '');
    const next = [...digits];

    if (cleaned.length > 1) {
      let i = index;
      for (const char of cleaned) {
        if (i >= country.digits) break;
        next[i] = char;
        i += 1;
      }
      setDigits(next);
      emitChange(country, next);
      refs.current[Math.min(index + cleaned.length, country.digits - 1)]?.focus();
      return;
    }

    next[index] = cleaned;
    setDigits(next);
    emitChange(country, next);

    if (cleaned && index < country.digits - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  function handlePaste(index: number, e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasted) return;
    e.preventDefault();
    updateDigit(index, pasted);
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      e.preventDefault();
      const next = [...digits];
      next[index - 1] = '';
      setDigits(next);
      emitChange(country, next);
      refs.current[index - 1]?.focus();
      return;
    }

    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      refs.current[index - 1]?.focus();
    }

    if (e.key === 'ArrowRight' && index < country.digits - 1) {
      e.preventDefault();
      refs.current[index + 1]?.focus();
    }
  }

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const filtered = PHONE_COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.dial.includes(search) ||
      c.iso.toLowerCase().includes(search.toLowerCase()),
  );

  const complete = isValidMobileForCountry(country, digits);
  const displayNumber = digits.join('');

  return (
    <div className="dawa-field dawa-phone" ref={wrapRef}>
      <label className="dawa-label" htmlFor={id ?? `${listId}-0`}>
        {label}
        {required && <span className="dawa-label__req" aria-hidden> *</span>}
      </label>

      <div className="dawa-phone__row">
        <div className="dawa-phone__code-wrap">
          <button
            type="button"
            className="dawa-phone__code-btn"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-label={`Country code ${country.dial}`}
          >
            <span className="dawa-phone__flag" aria-hidden>{flagEmoji(country.iso)}</span>
            <span className="dawa-phone__dial">{country.dial}</span>
            <span className="dawa-phone__chev" aria-hidden>▾</span>
          </button>

          {open && (
            <div className="dawa-phone__dropdown" role="listbox" aria-label="Country codes">
              <input
                className="dawa-phone__search"
                type="search"
                placeholder="Search country…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
              <ul className="dawa-phone__list">
                {filtered.map((c) => (
                  <li key={c.iso}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={c.iso === country.iso}
                      className={`dawa-phone__option${c.iso === country.iso ? ' is-active' : ''}`}
                      onClick={() => selectCountry(c)}
                    >
                      <span className="dawa-phone__flag" aria-hidden>{flagEmoji(c.iso)}</span>
                      <span className="dawa-phone__option-name">{c.name}</span>
                      <span className="dawa-phone__option-dial">{c.dial}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div
          key={country.iso}
          className="dawa-phone__digits"
          style={{ '--phone-cols': PHONE_DIGITS_PER_ROW } as React.CSSProperties}
          role="group"
          aria-label={`Phone number — ${country.digits} digits`}
        >
          {digits.map((digit, i) => (
            <input
              key={`${country.iso}-${i}`}
              ref={(el) => { refs.current[i] = el; }}
              id={i === 0 ? (id ?? `${listId}-0`) : undefined}
              className="dawa-phone__digit"
              type="tel"
              inputMode="numeric"
              autoComplete={i === 0 ? 'tel-national' : 'off'}
              maxLength={1}
              placeholder="·"
              value={digit}
              required={required && i === 0}
              aria-label={`Digit ${i + 1} of ${country.digits}`}
              onChange={(e) => updateDigit(i, e.target.value)}
              onPaste={(e) => handlePaste(i, e)}
              onKeyDown={(e) => handleKeyDown(i, e)}
            />
          ))}
        </div>

        {showTick && (
          <span className="dawa-validated-field__tick dawa-phone__tick" aria-label="Available">
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

      <p
        className={`dawa-phone__hint${hintVariant === 'error' ? ' is-error' : ''}`}
        role={hintVariant === 'error' ? 'alert' : undefined}
      >
        {hintMessage
          ? hintMessage
          : complete
            ? `${country.dial} ${displayNumber}`
            : `${country.digits} digits for ${country.name}`}
      </p>

      <input
        type="hidden"
        name="mobile"
        value={complete ? buildE164(country, digits) : ''}
        readOnly
        tabIndex={-1}
        aria-hidden
      />
    </div>
  );
}
