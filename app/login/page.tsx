'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthAside } from '@/components/auth/AuthAside';
import { AuthFrame } from '@/components/auth/AuthFrame';
import { PhoneInput } from '@/components/auth/PhoneInput';
import { ValidatedField } from '@/components/auth/ValidatedField';
import { PasswordField } from '@/components/auth/PasswordField';
import { LandingBackdrop } from '@/components/landing/LandingBackdrop';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';
import { ThemeModeToggle } from '@/components/ui/ThemeModeToggle';
import { useFieldAvailability } from '@/hooks/useFieldAvailability';
import {
  isValidEmail,
  sanitizeEmail,
  sanitizeName,
  sanitizeUsername,
  validateUsername,
} from '@/lib/validation';

type AuthMode = 'signin' | 'register';
type SignInMethod = 'email' | 'mobile';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [signInMethod, setSignInMethod] = useState<SignInMethod>('email');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
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

  const signInEmailValid = mode === 'signin' && signInMethod === 'email' && emailFormatValid;

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

  function handleForgotPassword(e: React.MouseEvent) {
    e.preventDefault();
    setError('');
    setInfo('Password reset is not available yet. Please contact support if you need help recovering your account.');
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
      if (signInMethod === 'email') {
        const emailVal = sanitizeEmail(String(fd.get('email') ?? email));
        if (!isValidEmail(emailVal)) {
          setLoading(false);
          setError('Enter a valid email address');
          return;
        }
        payload = { email: emailVal, password: passwordVal };
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
      <LandingBackdrop />
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
              {mode === 'signin' ? 'Sign in with your email or mobile number.' : 'Join Addawah — free, forever.'}
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
                    className={`dawa-auth__method-btn${signInMethod === 'email' ? ' is-active' : ''}`}
                    onClick={() => setSignInMethod('email')}
                  >
                    Email
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

              {(mode === 'register' || signInMethod === 'email') && (
                <ValidatedField
                  id="email"
                  name="email"
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required={mode === 'register' || signInMethod === 'email'}
                  sanitize={sanitizeEmail}
                  showTick={mode === 'register' ? emailAvailability.showTick : signInEmailValid}
                  hint={emailHint()}
                  hintVariant={emailHintVariant()}
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
                    <button type="button" className="dawa-auth__forgot" onClick={handleForgotPassword}>
                      Forgot password?
                    </button>
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
