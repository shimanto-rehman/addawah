'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { PasswordField } from '@/components/auth/PasswordField';
import { Modal } from '@/components/ui/Modal';
import { DELETE_CONFIRMATION_PHRASE } from '@/lib/account-deletion';
import { useApp } from '@/components/providers/AppProvider';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function DeleteAccountSection() {
  const router = useRouter();
  const { logout } = useApp();
  const { data: status } = useSWR<{ otpRequired: boolean; emailMasked: string }>(
    '/api/account/delete',
    fetcher,
  );

  const [open, setOpen] = useState(false);
  const [understandDataLoss, setUnderstandDataLoss] = useState(false);
  const [understandPermanent, setUnderstandPermanent] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');

  const otpRequired = status?.otpRequired ?? false;
  const phraseOk = phrase.trim().replace(/\s+/g, ' ').toLowerCase()
    === DELETE_CONFIRMATION_PHRASE.toLowerCase();
  const canDelete =
    understandDataLoss &&
    understandPermanent &&
    phraseOk &&
    password.length >= 1 &&
    (!otpRequired || otp.trim().length === 6);

  function resetForm() {
    setUnderstandDataLoss(false);
    setUnderstandPermanent(false);
    setPhrase('');
    setPassword('');
    setOtp('');
    setError('');
    setOtpSent(false);
    setOtpMessage('');
  }

  function closeModal() {
    if (busy) return;
    setOpen(false);
    resetForm();
  }

  async function sendOtp() {
    setOtpSending(true);
    setError('');
    setOtpMessage('');
    const res = await fetch('/api/account/delete/send-otp', { method: 'POST' });
    const json = await res.json();
    setOtpSending(false);
    if (!res.ok) {
      setError(json.error || 'Could not send code');
      return;
    }
    setOtpSent(true);
    setOtpMessage(`Code sent to ${status?.emailMasked ?? 'your email'}`);
  }

  async function deleteAccount() {
    if (!canDelete) return;
    setBusy(true);
    setError('');
    const res = await fetch('/api/account/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password,
        confirmationPhrase: phrase,
        understandPermanent: true,
        understandDataLoss: true,
        otp: otpRequired ? otp.trim() : undefined,
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error || 'Could not delete account');
      return;
    }
    await logout();
    router.push('/login?deleted=1');
  }

  return (
    <>
      <div className="dawa-panel dawa-panel--danger">
        <h2 className="dawa-panel__title">Delete account</h2>
        <p className="dawa-panel__sub">
          Permanently remove your account, salah history, connections, and gold coins.
          This cannot be undone.
        </p>
        <button
          type="button"
          className="dawa-btn dawa-btn--danger-outline"
          onClick={() => setOpen(true)}
        >
          Delete my account…
        </button>
      </div>

      <Modal open={open} onClose={closeModal} panelClassName="dawa-modal__panel--wide" labelledBy="delete-account-title">
            <h2 id="delete-account-title" className="dawa-modal__title dawa-modal__title--danger">
              Delete account permanently
            </h2>
            <p className="dawa-modal__message">
              You will lose access to your salah records, brotherhood connections, badges,
              and gold coins. Your username will become available for others.
            </p>

            <ul className="dawa-delete-checklist">
              <li>
                <label className="dawa-delete-check">
                  <input
                    type="checkbox"
                    checked={understandDataLoss}
                    onChange={(e) => setUnderstandDataLoss(e.target.checked)}
                  />
                  <span>I understand all my data will be permanently deleted</span>
                </label>
              </li>
              <li>
                <label className="dawa-delete-check">
                  <input
                    type="checkbox"
                    checked={understandPermanent}
                    onChange={(e) => setUnderstandPermanent(e.target.checked)}
                  />
                  <span>I understand this action cannot be undone</span>
                </label>
              </li>
            </ul>

            <div className="dawa-field">
              <label className="dawa-label" htmlFor="delete-phrase">
                Type <strong>{DELETE_CONFIRMATION_PHRASE}</strong> to confirm
              </label>
              <input
                id="delete-phrase"
                className="dawa-input"
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder={DELETE_CONFIRMATION_PHRASE}
              />
            </div>

            <PasswordField
              id="delete-password"
              label="Your password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              required
            />

            {otpRequired ? (
              <div className="dawa-delete-otp">
                <p className="dawa-delete-otp__lead">
                  Email verification is required. We&apos;ll send a 6-digit code to{' '}
                  <strong>{status?.emailMasked ?? 'your email'}</strong>.
                </p>
                <div className="dawa-delete-otp__row">
                  <button
                    type="button"
                    className="dawa-btn dawa-btn--outline dawa-btn--sm"
                    disabled={otpSending}
                    onClick={sendOtp}
                  >
                    {otpSending ? 'Sending…' : otpSent ? 'Resend code' : 'Send verification code'}
                  </button>
                  {otpMessage && <p className="dawa-delete-otp__sent">{otpMessage}</p>}
                </div>
                <div className="dawa-field">
                  <label className="dawa-label" htmlFor="delete-otp">Verification code</label>
                  <input
                    id="delete-otp"
                    className="dawa-input dawa-delete-otp__input"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    autoComplete="one-time-code"
                  />
                </div>
              </div>
            ) : (
              <p className="dawa-delete-otp__fallback">
                Email verification is unavailable on this server. Deletion requires your
                password and typed confirmation above.
              </p>
            )}

            {error && <p className="dawa-error dawa-delete-error">{error}</p>}

            <div className="dawa-modal__actions">
              <button type="button" className="dawa-btn dawa-btn--outline" disabled={busy} onClick={closeModal}>
                Cancel
              </button>
              <button
                type="button"
                className="dawa-btn dawa-btn--danger"
                disabled={!canDelete || busy}
                onClick={deleteAccount}
              >
                {busy ? 'Deleting…' : 'Delete my account forever'}
              </button>
            </div>
      </Modal>
    </>
  );
}
