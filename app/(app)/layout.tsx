import { privateAppMetadata } from '@/lib/seo';
import { AppLayoutClient } from './AppLayoutClient';

export const metadata = privateAppMetadata;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppLayoutClient>{children}</AppLayoutClient>;
}
