'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AuthAside } from '@/components/auth/AuthAside';
import { AuthFrame } from '@/components/auth/AuthFrame';
import { PhoneInput } from '@/components/auth/PhoneInput';
import { ValidatedField } from '@/components/auth/ValidatedField';
import { PasswordField } from '@/components/auth/PasswordField';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';
import { ThemeModeToggle } from '@/components/ui/ThemeModeToggle';
import { useFieldAvailability } from '@/hooks/useFieldAvailability';
import { useSigninAvailability } from '@/hooks/useSigninAvailability';
import {
  isValidEmail,
  sanitizeEmail,
  sanitizeName,
  sanitizeUsername,
  validateUsername,
} from '@/lib/validation';

type AuthMode = 'signin' | 'register';
type SignInMethod = 'identifier' | 'mobile';

export function LoginPageClient() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [signInMethod, setSignInMethod] = useState<SignInMethod>('identifier');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get('deleted') === '1') {
      setInfo('Your account has been permanently deleted.');
    }
    if (searchParams.get('reset') === '1') {
      setInfo('Your password was updated. Sign in with your new password.');
    }
  }, [searchParams]);

  const cleanEmail = sanitizeEmail(email);
  const cleanUsername = sanitizeUsername(username);
  const emailFormatValid = isValidEmail(cleanEmail);
  const usernameFormatValid = validateUsername(cleanUsername).valid;
  const mobileFormatValid = mobile.length > 0;

  const usernameAvailability = useFieldAvailability('username', cleanUsername, usernameFormatValid);
  const emailAvailability = useFieldAvailability(
    'email',
    cleanEmail,
    emailFormatValid,
  );
  const mobileAvailability = useFieldAvailability('mobile', mobile, mobileFormatValid);

  // Sign-in identifier availability (green tick when account exists)
  const signinAvailability = useSigninAvailability(identifier);

  // Identifier type hint
  const identifierIsEmail = identifier.includes('@');
  const identifierTypeHint = identifier.trim().length === 0
    ? undefined
    : identifierIsEmail
      ? 'Logging in as email'
      : identifier.trim().length >= 3
        ? 'Logging in as username'
        : undefined;

  const passwordValid = password.length >= 6;
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const confirmPasswordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const registerReady =
    mode === 'register' &&
    name.trim().length >= 2 &&
    usernameAvailability.showTick &&
    emailAvailability.showTick &&
    mobileAvailability.showTick &&
    passwordValid &&
    passwordsMatch;

  function switchMode(next: AuthMode) {
    setMode(next);
    setError('');
    setInfo('');
    if (next === 'signin') setConfirmPassword('');
  }


  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setInfo('');

    const fd = new FormData(e.currentTarget);
    const passwordVal = String(fd.get('password') ?? password);

    if (mode === 'register' && passwordVal !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    const endpoint = mode === 'signin' ? '/api/auth/login' : '/api/auth/register';
    let payload: Record<string, string>;

    if (mode === 'signin') {
      if (signInMethod === 'identifier') {
        const identifierVal = String(fd.get('identifier') ?? identifier).trim();
        if (!identifierVal) {
          setLoading(false);
          setError('Enter your email or username');
          return;
        }
        payload = { identifier: identifierVal, password: passwordVal };
      } else {
        const mobileVal = String(fd.get('mobile') ?? mobile);
        if (!mobileVal) {
          setLoading(false);
          setError('Enter your complete mobile number');
          return;
        }
        payload = { mobile: mobileVal, password: passwordVal };
      }
    } else {
      payload = {
        name: sanitizeName(name),
        username: cleanUsername,
        email: cleanEmail,
        mobile,
        password: passwordVal,
      };
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error || 'Something went wrong');
      return;
    }

    window.location.assign('/dashboard');
  }

  function emailHint() {
    if (mode === 'register') {
      if (emailAvailability.message) return emailAvailability.message;
      if (emailAvailability.status === 'checking') return 'Checking availability…';
    }
    return undefined;
  }

  function emailHintVariant(): 'info' | 'error' {
    if (mode === 'register' && (emailAvailability.status === 'taken' || emailAvailability.status === 'invalid')) {
      return 'error';
    }
    return 'info';
  }

  function usernameHint() {
    if (usernameAvailability.message) return usernameAvailability.message;
    if (usernameAvailability.status === 'checking') return 'Checking availability…';
    return undefined;
  }

  function usernameHintVariant(): 'info' | 'error' {
    if (usernameAvailability.status === 'taken' || usernameAvailability.status === 'invalid') {
      return 'error';
    }
    return 'info';
  }

  function mobileHintVariant(): 'info' | 'error' {
    if (mobileAvailability.status === 'taken' || mobileAvailability.status === 'invalid') {
      return 'error';
    }
    return 'info';
  }

  function mobileHint() {
    if (mobileAvailability.message) return mobileAvailability.message;
    if (mobileAvailability.status === 'checking') return 'Checking availability…';
    return undefined;
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
            <h1 className="dawa-auth__title">{mode === 'signin' ? 'Welcome back' : 'Create account'}</h1>
            <p className="dawa-auth__sub">
              {mode === 'signin' ? 'Sign in with your email, username, or mobile number.' : 'Join Addawah — free, forever.'}
            </p>

            <div className="dawa-auth__tabs" role="tablist" aria-label="Authentication mode">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signin'}
                className={`dawa-auth__tab${mode === 'signin' ? ' is-active' : ''}`}
                onClick={() => switchMode('signin')}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'register'}
                className={`dawa-auth__tab${mode === 'register' ? ' is-active' : ''}`}
                onClick={() => switchMode('register')}
              >
                Register
              </button>
            </div>

            <form className="dawa-auth__form" onSubmit={submit}>
              {mode === 'register' && (
                <div className="dawa-field">
                  <label className="dawa-label" htmlFor="name">Full name</label>
                  <input
                    id="name"
                    className="dawa-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                    required
                  />
                </div>
              )}

              {mode === 'register' && (
                <ValidatedField
                  id="username"
                  label="Username"
                  value={username}
                  onChange={setUsername}
                  placeholder="yourname"
                  autoComplete="username"
                  required
                  prefix="@"
                  sanitize={sanitizeUsername}
                  showTick={usernameAvailability.showTick}
                  hint={usernameHint()}
                  hintVariant={usernameHintVariant()}
                />
              )}

              {mode === 'signin' && (
                <div className="dawa-auth__method">
                  <button
                    type="button"
                    className={`dawa-auth__method-btn${signInMethod === 'identifier' ? ' is-active' : ''}`}
                    onClick={() => setSignInMethod('identifier')}
                  >
                    Email or Username
                  </button>
                  <button
                    type="button"
                    className={`dawa-auth__method-btn${signInMethod === 'mobile' ? ' is-active' : ''}`}
                    onClick={() => setSignInMethod('mobile')}
                  >
                    Mobile
                  </button>
                </div>
              )}

              {mode === 'register' && (
                <ValidatedField
                  id="email"
                  name="email"
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  sanitize={sanitizeEmail}
                  showTick={emailAvailability.showTick}
                  hint={emailHint()}
                  hintVariant={emailHintVariant()}
                />
              )}

              {mode === 'signin' && signInMethod === 'identifier' && (
                <ValidatedField
                  id="identifier"
                  name="identifier"
                  label="Email or Username"
                  value={identifier}
                  onChange={setIdentifier}
                  placeholder="you@example.com or yourname"
                  autoComplete="username"
                  required
                  showTick={signinAvailability.showTick}
                  showCross={signinAvailability.showCross}
                  hint={signinAvailability.hint || (signinAvailability.status === 'checking' ? 'Checking…' : identifierTypeHint)}
                  hintVariant={signinAvailability.hintVariant}
                />
              )}

              {mode === 'register' && (
                <PhoneInput
                  id="register-mobile"
                  value={mobile}
                  onChange={setMobile}
                  required
                  showTick={mobileAvailability.showTick}
                  hintMessage={mobileHint()}
                  hintVariant={mobileHintVariant()}
                />
              )}

              {mode === 'signin' && signInMethod === 'mobile' && (
                <PhoneInput
                  id="signin-mobile"
                  value={mobile}
                  onChange={setMobile}
                  required
                  label="Mobile number"
                />
              )}

              <PasswordField
                id="password"
                name="password"
                label="Password"
                value={password}
                onChange={setPassword}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
                minLength={6}
                labelAside={
                  mode === 'signin' ? (
                    <Link href="/reset-password" className="dawa-auth__forgot">
                      Forgot password?
                    </Link>
                  ) : undefined
                }
              />

              {mode === 'register' && (
                <PasswordField
                  id="confirm-password"
                  label="Confirm password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  showTick={passwordsMatch && passwordValid}
                  hint={
                    confirmPasswordMismatch
                      ? 'Passwords do not match'
                      : undefined
                  }
                  hintVariant={confirmPasswordMismatch ? 'error' : 'info'}
                />
              )}

              {info && <p className="dawa-auth__info">{info}</p>}
              {error && <p className="dawa-error">{error}</p>}

              <button
                type="submit"
                className="dawa-btn dawa-btn--primary dawa-auth__submit"
                disabled={loading || (mode === 'register' && !registerReady)}
              >
                {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            </form>

            <p className="dawa-auth__mobile-home">
              <a href="/">← Back to home</a>
            </p>
          </AuthFrame>
        </div>
      </div>
    </>
  );
}
