import type { Metadata } from 'next';
import './globals.css';
import { PreloaderGate } from '@/components/PreloaderGate';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { rootMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  ...rootMetadata,
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="dark"
      data-color="gold"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('addawah-mode')||'dark';var c=localStorage.getItem('addawah-color')||'gold';document.documentElement.setAttribute('data-theme',m);document.documentElement.setAttribute('data-color',c);}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <PreloaderGate>{children}</PreloaderGate>
        </ThemeProvider>
      </body>
    </html>
  );
}
