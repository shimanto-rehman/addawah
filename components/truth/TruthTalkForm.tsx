'use client';

import { useState } from 'react';
import { ValidatedField } from '@/components/auth/ValidatedField';
import {
  isValidEmail,
  isValidName,
  sanitizeEmail,
  sanitizeName,
  sanitizeNameInput,
} from '@/lib/validation';

export function TruthTalkForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ name: false, email: false, message: false });

  const cleanName = sanitizeName(name);
  const cleanEmail = sanitizeEmail(email);
  const nameOk = isValidName(cleanName);
  const emailOk = isValidEmail(cleanEmail);
  const messageOk = message.trim().length >= 10;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setTouched({ name: true, email: true, message: true });

    if (!nameOk || !emailOk || !messageOk) {
      setError(
        !nameOk
          ? 'Enter a valid name (letters only, no numbers).'
          : !emailOk
            ? 'Enter a valid email address.'
            : 'Please share at least a short thought (10+ characters).',
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/truth/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          message: message.trim(),
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error || 'Could not send your message.');
        return;
      }
      setSuccess('JazakAllahu khairan — your thought was sent.');
      setName('');
      setEmail('');
      setMessage('');
      setTouched({ name: false, email: false, message: false });
    } catch {
      setError('Could not send your message. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="dawa-truth-talk__form" onSubmit={onSubmit} noValidate>
      <div className="dawa-truth-talk__row">
        <ValidatedField
          id="truth-name"
          name="name"
          label="Name"
          value={name}
          onChange={(v) => {
            setName(sanitizeNameInput(v));
            setTouched((t) => ({ ...t, name: true }));
            setError('');
            setSuccess('');
          }}
          placeholder="Your name"
          autoComplete="name"
          required
          sanitize={sanitizeNameInput}
          showTick={nameOk}
          showCross={touched.name && name.length > 0 && !nameOk}
          hint={
            touched.name && name.length > 0 && !nameOk
              ? 'Letters only — no numbers'
              : undefined
          }
          hintVariant="error"
        />
        <ValidatedField
          id="truth-email"
          name="email"
          label="Email"
          type="email"
          value={email}
          onChange={(v) => {
            setEmail(v);
            setTouched((t) => ({ ...t, email: true }));
            setError('');
            setSuccess('');
          }}
          placeholder="you@example.com"
          autoComplete="email"
          required
          sanitize={sanitizeEmail}
          showTick={emailOk}
          showCross={touched.email && email.length > 0 && !emailOk}
          hint={
            touched.email && email.length > 0 && !emailOk
              ? 'Enter a valid email address'
              : undefined
          }
          hintVariant="error"
        />
      </div>

      <label className="dawa-truth-field" htmlFor="truth-message">
        <span>Your question or observation</span>
        <textarea
          id="truth-message"
          name="message"
          rows={4}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value.slice(0, 2000));
            setTouched((t) => ({ ...t, message: true }));
            setError('');
            setSuccess('');
          }}
          placeholder="Share a question, a concept, or something you noticed…"
          required
          aria-invalid={touched.message && !messageOk ? true : undefined}
        />
        {touched.message && message.length > 0 && !messageOk && (
          <span className="dawa-truth-talk__hint is-error">A little more detail helps (10+ characters).</span>
        )}
      </label>

      {error && (
        <p className="dawa-truth-talk__status is-error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="dawa-truth-talk__status is-success" role="status">
          {success}
        </p>
      )}

      <button type="submit" className="dawa-btn dawa-btn--primary" disabled={loading}>
        {loading ? 'Sending…' : 'Share your thought'}
      </button>
    </form>
  );
}
