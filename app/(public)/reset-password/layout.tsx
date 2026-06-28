import { resetPasswordMetadata } from '@/lib/seo';

export const metadata = resetPasswordMetadata;

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
