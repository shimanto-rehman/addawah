'use client';

import Link from 'next/link';
import { GATE_ARCH_SRC } from '@/lib/constants';

export function AuthAside() {
  return (
    <aside className="dawa-auth__aside">
      <div
        className="dawa-auth__aside-arch"
        style={{ backgroundImage: `url('${GATE_ARCH_SRC}')` }}
      />
      <p className="dawa-auth__aside-ar">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
      <p className="dawa-auth__aside-line">A sanctuary for salah, brotherhood, and spiritual growth.</p>
      <Link href="/" className="dawa-auth__aside-link">← Back to home</Link>
    </aside>
  );
}
