'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { BrandMark } from '@/components/ui/BrandMark';

type AuthFrameProps = {
  children: React.ReactNode;
};

export function AuthFrame({ children }: AuthFrameProps) {
  return (
    <motion.div
      className="dawa-auth__card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="dawa-auth__head">
        <Link href="/" className="dawa-auth__brand">
          <BrandMark />
          <span>Addawah</span>
        </Link>
      </header>
      <div className="dawa-auth__scroll dawa-scrollbar">{children}</div>
    </motion.div>
  );
}
