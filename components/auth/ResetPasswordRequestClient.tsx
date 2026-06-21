'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthAside } from '@/components/auth/AuthAside';
import { AuthFrame } from '@/components/auth/AuthFrame';
import { OtpField } from '@/components/auth/OtpField';
import { ValidatedField } from '@/components/auth/ValidatedField';
import { LandingBackdrop } from '@/components/landing/LandingBackdrop';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';
import { ThemeModeToggle } from '@/components/ui/ThemeModeToggle';
import { isValidEmail, sanitizeEmail } from '@/lib/validation';

type Step = 'email' | 'otp';

export function ResetPasswordRequestClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [emailMasked, setEmailMasked] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const cleanEmail = sanitizeEmail(email);
  const emailValid = isValidEmail(cleanEmail);
  const otpValid = otp.length === 6;

  async function sendOtp() {
    if (!emailValid) {
      setError('Enter a valid email address');
      return;
    }

    setSending(true);
    setError('');
    setInfo('');

    const res = await fetch('/api/auth/reset-password/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail }),
    });
    const json = await res.json();
    setSending(false);

    if (!res.ok) {
      setError(json.error || 'Could not send code');
      return;
    }

    setEmailMasked(json.emailMasked ?? cleanEmail);
    setStep('otp');
    setInfo(json.message || 'Check your email for a 6-digit code.');
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otpValid) {
      setError('Enter the 6-digit code from your email');
      return;
    }

    setVerifying(true);
    setError('');
    setInfo('');

    const res = await fetch('/api/auth/reset-password/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, otp }),
    });
    const json = await res.json();
    setVerifying(false);

    if (!res.ok) {
      setError(json.error || 'Incorrect code');
      return;
    }

    const params = new URLSearchParams({ token: json.resetToken });
    router.push(`/reset-password/set?${params.toString()}`);
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
            <h1 className="dawa-auth__title">Reset password</h1>
            <p className="dawa-auth__sub">
              {step === 'email'
                ? 'Enter the email on your account. We will send a verification code.'
                : `Enter the 6-digit code sent to ${emailMasked || 'your email'}.`}
            </p>

            {step === 'email' ? (
              <form
                className="dawa-auth__form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendOtp();
                }}
              >
                <ValidatedField
                  id="reset-email"
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  sanitize={sanitizeEmail}
                  showTick={emailValid}
                />

                {info && <p className="dawa-auth__info">{info}</p>}
                {error && <p className="dawa-error">{error}</p>}

                <button
                  type="submit"
                  className="dawa-btn dawa-btn--primary dawa-auth__submit"
                  disabled={sending || !emailValid}
                >
                  {sending ? 'Sending…' : 'Send verification code'}
                </button>
              </form>
            ) : (
              <form className="dawa-auth__form" onSubmit={verifyOtp}>
                <OtpField
                  id="reset-otp"
                  label="Verification code"
                  value={otp}
                  onChange={setOtp}
                  required
                  showTick={otpValid}
                  labelAside={
                    <button
                      type="button"
                      className="dawa-auth__forgot"
                      disabled={sending}
                      onClick={() => void sendOtp()}
                    >
                      {sending ? 'Sending…' : 'Resend code'}
                    </button>
                  }
                />

                {info && <p className="dawa-auth__info">{info}</p>}
                {error && <p className="dawa-error">{error}</p>}

                <div className="dawa-auth__form-actions">
                  <button
                    type="submit"
                    className="dawa-btn dawa-btn--primary dawa-auth__submit"
                    disabled={verifying || !otpValid}
                  >
                    {verifying ? 'Verifying…' : 'Verify code'}
                  </button>

                  <button
                    type="button"
                    className="dawa-btn dawa-btn--outline dawa-auth__submit dawa-auth__submit--secondary"
                    onClick={() => {
                      setStep('email');
                      setOtp('');
                      setError('');
                      setInfo('');
                    }}
                  >
                    Use a different email
                  </button>
                </div>
              </form>
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
