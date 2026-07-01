'use client';

const STEP_LABELS = ['Taqwa Pulse', 'Fahm Test', 'Barakah Meter', 'Dua Log'];

export function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div>
      <p className="dawa-step-label">
        Step {currentStep + 1} of 4 — {STEP_LABELS[currentStep]}
      </p>
      <div className="dawa-step-indicator">
        {STEP_LABELS.map((label, i) => (
          <span
            key={label}
            className={`dawa-step-dot${i === currentStep ? ' is-active' : ''}${i < currentStep ? ' is-done' : ''}`}
            title={label}
          />
        ))}
      </div>
    </div>
  );
}
