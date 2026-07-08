'use client';

/**
 * Two-option gender selector with iconography.
 * Used by both the registration form and the profile editor so the visual
 * language stays consistent. Stateless and controlled — the parent owns the
 * value, we only emit changes.
 *
 * Accessibility: renders as a radiogroup; each option is a `radio` input
 * visually hidden behind a styled label, so keyboard + screen-reader behaviour
 * comes for free.
 */
export type Gender = 'MALE' | 'FEMALE';

function MaleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="10" cy="14" r="5" />
      <path d="M14 10l6-6" />
      <path d="M15 4h5v5" />
    </svg>
  );
}

function FemaleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="9" r="5" />
      <path d="M12 14v7" />
      <path d="M9 18h6" />
    </svg>
  );
}

type Props = {
  value: Gender | null;
  onChange: (g: Gender) => void;
  name?: string;
};

export function GenderPicker({ value, onChange, name = 'gender' }: Props) {
  return (
    <div className="dawa-gender" role="radiogroup" aria-label="Gender">
      <input type="hidden" name={name} value={value ?? ''} />
      {(['MALE', 'FEMALE'] as const).map((g) => {
        const active = value === g;
        return (
          <button
            key={g}
            type="button"
            role="radio"
            aria-checked={active}
            className={`dawa-gender__option${active ? ' is-active' : ''}`}
            onClick={() => onChange(g)}
          >
            <span className="dawa-gender__icon">
              {g === 'MALE' ? <MaleIcon /> : <FemaleIcon />}
            </span>
            <span className="dawa-gender__label">
              {g === 'MALE' ? 'Brother' : 'Sister'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
