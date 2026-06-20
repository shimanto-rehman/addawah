import { Suspense } from 'react';
import { LoginPageClient } from '@/components/auth/LoginPageClient';

function LoginFallback() {
  return (
    <div className="dawa-auth">
      <p className="dawa-page-loading">Loading…</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageClient />
    </Suspense>
  );
}
