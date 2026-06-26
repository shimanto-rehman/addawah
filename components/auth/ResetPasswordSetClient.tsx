'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthAside } from '@/components/auth/AuthAside';
import { AuthFrame } from '@/components/auth/AuthFrame';
import { PasswordField } from '@/components/auth/PasswordField';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';
import { ThemeModeToggle } from '@/components/ui/ThemeModeToggle';

type ResetUser = {
  name: string;
  username: string | null;
  avatarColor: string;
  avatarUrl: string | null;
};

export function ResetPasswordSetClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';

  const [user, setUser] = useState<ResetUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const passwordValid = password.length >= 6;
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const confirmMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const canSubmit = passwordValid && passwordsMatch && Boolean(token);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('Reset link is invalid. Request a new code from the sign-in page.');
      return;
    }

    let cancelled = false;

    void (async () => {
      const res = await fetch(`/api/auth/reset-password/session?token=${encodeURIComponent(token)}`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (cancelled) return;

      if (!res.ok) {
        setError(json.error || 'Reset link expired');
        setUser(null);
      } else {
        setUser(json.user);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setBusy(true);
    setError('');

    const res = await fetch('/api/auth/reset-password/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password, confirmPassword }),
    });
    const json = await res.json();
    setBusy(false);

    if (!res.ok) {
      setError(json.error || 'Could not reset password');
      return;
    }

    router.push('/login?reset=1');
  }

  return (
    <>
      <div className="dawa-auth">
        <div className="dawa-auth__theme-bar">
          <ThemeModeToggle compact />
          <ThemeSwitcher compact />
        </div>

        <div className="dawa-auth__layout">
          <AuthAside />

          <AuthFrame>
            {loading ? (
              <p className="dawa-page-loading">Loading…</p>
            ) : user ? (
              <>
                <div className="dawa-reset-password__hero">
                  <UserAvatar
                    name={user.name}
                    avatarColor={user.avatarColor}
                    avatarUrl={user.avatarUrl}
                    resetToken={token}
                    size={88}
                    className="dawa-reset-password__avatar"
                  />
                  <h1 className="dawa-reset-password__name">{user.name}</h1>
                  {user.username && (
                    <p className="dawa-reset-password__username">@{user.username}</p>
                  )}
                </div>

                <h2 className="dawa-auth__title">Choose a new password</h2>
                <p className="dawa-auth__sub">
                  Your new password must be at least 6 characters. You will sign in again after saving.
                </p>

                <form className="dawa-auth__form" onSubmit={submit}>
                  <PasswordField
                    id="new-password"
                    label="New password"
                    value={password}
                    onChange={setPassword}
                    autoComplete="new-password"
                    required
                    minLength={6}
                    showTick={passwordValid}
                  />

                  <PasswordField
                    id="confirm-new-password"
                    label="Confirm new password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    autoComplete="new-password"
                    required
                    minLength={6}
                    showTick={passwordsMatch && passwordValid}
                    hint={confirmMismatch ? 'Passwords do not match' : undefined}
                    hintVariant={confirmMismatch ? 'error' : 'info'}
                  />

                  {error && <p className="dawa-error">{error}</p>}

                  <button
                    type="submit"
                    className="dawa-btn dawa-btn--primary dawa-auth__submit"
                    disabled={!canSubmit || busy}
                  >
                    {busy ? 'Saving…' : 'Update password'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <h1 className="dawa-auth__title">Link expired</h1>
                <p className="dawa-auth__sub">
                  {error || 'This password reset link is no longer valid.'}
                </p>
                <Link href="/reset-password" className="dawa-btn dawa-btn--primary dawa-auth__submit dawa-auth__submit--solo">
                  Start over
                </Link>
              </>
            )}

            <p className="dawa-auth__mobile-home">
              <Link href="/login">← Back to sign in</Link>
            </p>
          </AuthFrame>
        </div>
      </div>
    </>
  );
}
