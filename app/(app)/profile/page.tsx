'use client';

import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { PageHeader } from '@/components/layout/PageHeader';
import { PhoneInput } from '@/components/auth/PhoneInput';
import { ValidatedField } from '@/components/auth/ValidatedField';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { useApp } from '@/components/providers/AppProvider';
import { useFieldAvailability } from '@/hooks/useFieldAvailability';
import { AVATAR_COLORS } from '@/lib/constants';
import { MAX_AVATAR_LABEL, validateAvatarFile } from '@/lib/avatar-limits';
import { PHONE_COUNTRIES } from '@/lib/phone-countries';
import {
  DEFAULT_PROFILE_PRIVACY,
  PROFILE_PRIVACY_KEYS,
  PROFILE_PRIVACY_META,
  type ProfilePrivacy,
} from '@/lib/profile-privacy';
import { userProfilePath } from '@/lib/user-public-stats';
import { isValidEmail, sanitizeEmail, sanitizeName } from '@/lib/validation';
import Link from 'next/link';
import { ProfilePrayerCharts } from '@/components/profile/ProfilePrayerCharts';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Profile = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  mobile: string | null;
  avatarColor: string;
  avatarUrl: string | null;
  city: string | null;
  country: string;
  profilePrivacy: ProfilePrivacy;
};

export default function ProfilePage() {
  const { user, refresh } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const { data, mutate, isLoading } = useSWR<{ profile: Profile }>('/api/profile', fetcher);

  const profile = data?.profile;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [avatarColor, setAvatarColor] = useState('#d4af37');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profilePrivacy, setProfilePrivacy] = useState<ProfilePrivacy>(DEFAULT_PROFILE_PRIVACY);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile) return;
    setName(profile.name);
    setEmail(profile.email);
    setMobile(profile.mobile ?? '');
    setCity(profile.city ?? '');
    setCountry(profile.country);
    setAvatarColor(profile.avatarColor);
    setAvatarUrl(profile.avatarUrl);
    setProfilePrivacy(profile.profilePrivacy ?? DEFAULT_PROFILE_PRIVACY);
  }, [profile]);

  const cleanEmail = sanitizeEmail(email);
  const emailFormatValid = isValidEmail(cleanEmail);
  const emailAvailability = useFieldAvailability('email', cleanEmail, emailFormatValid, user?.id);
  const mobileAvailability = useFieldAvailability('mobile', mobile, mobile.length > 0, user?.id);

  const emailUnchanged = profile && cleanEmail === profile.email;
  const mobileUnchanged = profile && mobile === (profile.mobile ?? '');
  const emailOk = emailUnchanged || emailAvailability.showTick;
  const mobileOk = mobileUnchanged || mobileAvailability.showTick;

  const canSave =
    profile &&
    name.trim().length >= 2 &&
    emailOk &&
    mobileOk &&
    mobile.length > 0;

  async function uploadAvatar(file: File) {
    const validationError = validateAvatarFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setError('');
    const form = new FormData();
    form.append('avatar', file);
    const res = await fetch('/api/profile/avatar', { method: 'POST', body: form });
    const json = await res.json();
    setUploading(false);
    if (!res.ok) {
      setError(json.error || 'Upload failed');
      return;
    }
    setAvatarUrl(json.profile.avatarUrl);
    await mutate({ profile: json.profile }, false);
    refresh();
  }

  async function removeAvatar() {
    setUploading(true);
    setError('');
    const res = await fetch('/api/profile/avatar', { method: 'DELETE' });
    const json = await res.json();
    setUploading(false);
    if (!res.ok) {
      setError(json.error || 'Could not remove photo');
      return;
    }
    setAvatarUrl(null);
    await mutate({ profile: json.profile }, false);
    refresh();
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setError('');
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: sanitizeName(name),
        email: cleanEmail,
        mobile,
        city,
        country,
        avatarColor,
        profilePrivacy,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || 'Save failed');
      return;
    }
    await mutate({ profile: json.profile }, false);
    refresh();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <>
      <PageHeader
        title="Profile"
        subtitle="Your photo, account details, and what others can see."
        arabicLabel="الملف الشخصي"
      />

      {isLoading ? (
        <p className="dawa-profile__loading">Loading profile…</p>
      ) : (
        <form className="dawa-profile" onSubmit={saveProfile}>
          <section className="dawa-profile__photo-panel">
            <div className="dawa-profile__photo-wrap">
              <UserAvatar
                name={name || profile?.name || 'User'}
                avatarColor={avatarColor}
                avatarUrl={avatarUrl}
                size={96}
                className="dawa-profile__avatar"
              />
              <div className="dawa-profile__photo-actions">
                <button
                  type="button"
                  className="dawa-btn dawa-btn--outline"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? 'Uploading…' : avatarUrl ? 'Change photo' : 'Upload photo'}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    className="dawa-btn dawa-btn--outline"
                    disabled={uploading}
                    onClick={removeAvatar}
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadAvatar(file);
                  e.target.value = '';
                }}
              />
              <p className="dawa-profile__photo-hint">JPG, PNG, or WebP · max {MAX_AVATAR_LABEL}</p>
            </div>

            <div className="dawa-profile__colors">
              <p className="dawa-label">Fallback colour</p>
              <div className="dawa-profile__swatches">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`dawa-profile__swatch${avatarColor === c ? ' is-active' : ''}`}
                    style={{ background: c }}
                    onClick={() => setAvatarColor(c)}
                    aria-label={`Avatar colour ${c}`}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="dawa-panel dawa-profile__details">
            <h2 className="dawa-panel__title">Account details</h2>
            <p className="dawa-panel__sub">Username cannot be changed after registration.</p>

            <div className="dawa-field">
              <label className="dawa-label" htmlFor="profile-name">Full name</label>
              <input
                id="profile-name"
                className="dawa-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={80}
              />
            </div>

            <div className="dawa-field">
              <label className="dawa-label" htmlFor="profile-username">Username</label>
              <input
                id="profile-username"
                className="dawa-input"
                value={profile?.username ? `@${profile.username}` : '—'}
                readOnly
                disabled
              />
            </div>

            <ValidatedField
              id="profile-email"
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              required
              showTick={emailOk}
              hint={
                !emailUnchanged && emailAvailability.message
                  ? emailAvailability.message
                  : undefined
              }
              hintVariant={
                emailAvailability.status === 'taken' || emailAvailability.status === 'invalid'
                  ? 'error'
                  : 'info'
              }
            />

            <PhoneInput
              id="profile-mobile"
              value={mobile}
              onChange={setMobile}
              required
              showTick={mobileOk}
              hintMessage={
                !mobileUnchanged && mobileAvailability.message
                  ? mobileAvailability.message
                  : undefined
              }
              hintVariant={
                mobileAvailability.status === 'taken' || mobileAvailability.status === 'invalid'
                  ? 'error'
                  : 'info'
              }
            />

            <div className="dawa-field">
              <label className="dawa-label" htmlFor="profile-city">City</label>
              <input
                id="profile-city"
                className="dawa-input"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Dhaka"
                maxLength={80}
              />
            </div>

            <div className="dawa-field">
              <label className="dawa-label" htmlFor="profile-country">Country</label>
              <select
                id="profile-country"
                className="dawa-input"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                {PHONE_COUNTRIES.map((c) => (
                  <option key={c.iso} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

          </section>

          <section className="dawa-panel dawa-profile__privacy">
            <h2 className="dawa-panel__title">Public profile visibility</h2>
            <p className="dawa-panel__sub">
              Choose what connections and visitors see on your public profile and the Wakt board.
              Your name and username are always visible.
            </p>
            {profile?.username && (
              <p className="dawa-profile__preview-link">
                <Link href={userProfilePath(profile.username)} className="dawa-link">
                  Preview your public profile →
                </Link>
              </p>
            )}
            <ul className="dawa-privacy-list">
              {PROFILE_PRIVACY_KEYS.map((key) => (
                <li key={key} className="dawa-privacy-item">
                  <div className="dawa-privacy-item__text">
                    <p className="dawa-privacy-item__label">{PROFILE_PRIVACY_META[key].label}</p>
                    <p className="dawa-privacy-item__desc">{PROFILE_PRIVACY_META[key].description}</p>
                  </div>
                  <label className="dawa-privacy-toggle">
                    <input
                      type="checkbox"
                      checked={profilePrivacy[key]}
                      onChange={(e) =>
                        setProfilePrivacy((prev) => ({ ...prev, [key]: e.target.checked }))
                      }
                    />
                    <span className="dawa-privacy-toggle__track" aria-hidden />
                    <span className="sr-only">
                      {profilePrivacy[key] ? 'Public' : 'Private'}: {PROFILE_PRIVACY_META[key].label}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            {error && <p className="dawa-profile__error">{error}</p>}
            <button type="submit" className="dawa-btn dawa-btn--primary" disabled={!canSave}>
              {saved ? 'Saved ✓' : 'Save profile'}
            </button>
          </section>
        </form>
      )}

      {!isLoading && profile?.username && (
        <ProfilePrayerCharts insightsUrl="/api/insights" title="Your prayer charts" />
      )}
    </>
  );
}
