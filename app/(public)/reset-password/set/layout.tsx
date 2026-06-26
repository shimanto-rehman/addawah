import { setPasswordMetadata } from '@/lib/seo';

export const metadata = setPasswordMetadata;

export default function SetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
