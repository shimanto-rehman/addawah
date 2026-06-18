'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IslamicBackdrop } from '@/components/layout/IslamicBackdrop';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';
import { ThemeModeToggle } from '@/components/ui/ThemeModeToggle';
import { SITE_TAGLINE } from '@/lib/constants';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch(`/api/auth/${mode === 'signin' ? 'login' : 'register'}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error || 'Something went wrong');
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <>
      <IslamicBackdrop />
      <div className="dawa-auth">
        <div className="dawa-auth__theme-bar">
          <ThemeModeToggle compact />
          <ThemeSwitcher compact />
        </div>
        <div className="dawa-auth__frame">
          <div className="dawa-auth__arch-cap" />
          <div className="dawa-auth__body">
            <p className="dawa-auth__arabic">بِسْمِ اللَّهِ</p>
            <h1 className="dawa-auth__title">{mode === 'signin' ? 'Welcome back' : 'Join the ummah'}</h1>
            <p className="dawa-auth__sub">{SITE_TAGLINE}</p>

            <div className="dawa-auth__tabs">
              <button type="button" className={`dawa-auth__tab${mode === 'signin' ? ' is-active' : ''}`} onClick={() => setMode('signin')}>Sign In</button>
              <button type="button" className={`dawa-auth__tab${mode === 'register' ? ' is-active' : ''}`} onClick={() => setMode('register')}>Register</button>
            </div>

            <form onSubmit={submit}>
              {mode === 'register' && (
                <div className="dawa-field">
                  <label className="dawa-label" htmlFor="name">Full name</label>
                  <input id="name" className="dawa-input" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
              )}
              <div className="dawa-field">
                <label className="dawa-label" htmlFor="email">Email</label>
                <input id="email" type="email" className="dawa-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="dawa-field">
                <label className="dawa-label" htmlFor="password">Password</label>
                <input id="password" type="password" className="dawa-input" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
              {error && <p className="dawa-error">{error}</p>}
              <button type="submit" className="dawa-btn dawa-btn--primary" style={{ width: '100%', marginTop: 8, justifyContent: 'center' }} disabled={loading}>
                {loading ? 'Please wait…' : mode === 'signin' ? 'Enter' : 'Create Account'}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13 }}>
              <Link href="/" style={{ color: 'var(--accent-bright)' }}>← Return home</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
