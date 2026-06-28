import { Suspense } from 'react';
import { ResetPasswordSetClient } from '@/components/auth/ResetPasswordSetClient';

function ResetSetFallback() {
  return (
    <div className="dawa-auth">
      <p className="dawa-page-loading">Loading…</p>
    </div>
  );
}

export default function ResetPasswordSetPage() {
  return (
    <Suspense fallback={<ResetSetFallback />}>
      <ResetPasswordSetClient />
    </Suspense>
  );
}
