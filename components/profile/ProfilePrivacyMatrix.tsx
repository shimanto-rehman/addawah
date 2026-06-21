'use client';

import {
  PROFILE_PRIVACY_KEYS,
  PROFILE_PRIVACY_META,
  type ProfilePrivacy,
  type ProfilePrivacyAudience,
  type ProfilePrivacyKey,
} from '@/lib/profile-privacy';

type ProfilePrivacyMatrixProps = {
  value: ProfilePrivacy;
  onChange: (next: ProfilePrivacy) => void;
};

function PrivacyToggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="dawa-privacy-toggle dawa-privacy-toggle--cell">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="dawa-privacy-toggle__track" aria-hidden />
      <span className="sr-only">{label}</span>
    </label>
  );
}

export function ProfilePrivacyMatrix({ value, onChange }: ProfilePrivacyMatrixProps) {
  function setTier(audience: ProfilePrivacyAudience, key: ProfilePrivacyKey, checked: boolean) {
    onChange({
      ...value,
      [audience]: { ...value[audience], [key]: checked },
    });
  }

  return (
    <div className="dawa-privacy-matrix">
      <div className="dawa-privacy-matrix__head" aria-hidden>
        <span className="dawa-privacy-matrix__head-setting">Setting</span>
        <span className="dawa-privacy-matrix__head-col">Public</span>
        <span className="dawa-privacy-matrix__head-col">Connections</span>
      </div>
      <ul className="dawa-privacy-matrix__list">
        {PROFILE_PRIVACY_KEYS.map((key) => (
          <li key={key} className="dawa-privacy-matrix__row">
            <div className="dawa-privacy-item__text">
              <p className="dawa-privacy-item__label">{PROFILE_PRIVACY_META[key].label}</p>
              <p className="dawa-privacy-item__desc">{PROFILE_PRIVACY_META[key].description}</p>
            </div>
            <div className="dawa-privacy-matrix__cell">
              <PrivacyToggle
                checked={value.public[key]}
                label={`Public: ${PROFILE_PRIVACY_META[key].label}`}
                onChange={(checked) => setTier('public', key, checked)}
              />
            </div>
            <div className="dawa-privacy-matrix__cell">
              <PrivacyToggle
                checked={value.connections[key]}
                label={`Connections: ${PROFILE_PRIVACY_META[key].label}`}
                onChange={(checked) => setTier('connections', key, checked)}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
