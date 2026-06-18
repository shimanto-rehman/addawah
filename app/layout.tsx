import type { Metadata } from 'next';
import './globals.css';
import { PreloaderGate } from '@/components/PreloaderGate';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/constants';

export const metadata: Metadata = {
  title: `${SITE_NAME} — ${SITE_TAGLINE}`,
  description:
    'Free Islamic web platform for Salah tracking, accountability, daily inspiration, and community support.',
  icons: {
    icon: '/favicon.ico',
  },
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
