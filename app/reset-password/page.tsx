import { Suspense } from 'react';
import { ResetPasswordRequestClient } from '@/components/auth/ResetPasswordRequestClient';

function ResetFallback() {
  return (
    <div className="dawa-auth">
      <p className="dawa-page-loading">Loading…</p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetFallback />}>
      <ResetPasswordRequestClient />
    </Suspense>
  );
}
