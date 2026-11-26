import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { BreatheWiseProvider } from '@/components/BreatheWiseProvider';
import { AppShell } from '@/components/AppShell';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BreatheWise AI — Your Intelligent Urban Air Quality Companion',
  description:
    'GenAI-powered urban air quality dashboard, personalized daily cleaner routines, indoor air guidance, sustainability impact calculator, and community clean-air network.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jakarta.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('breathewise-theme')==='dark'||(!localStorage.getItem('breathewise-theme')&&matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-screen antialiased selection:bg-emerald-500/20 selection:text-emerald-800 dark:selection:text-emerald-200">
        <BreatheWiseProvider>
          <AppShell>{children}</AppShell>
        </BreatheWiseProvider>
      </body>
    </html>
  );
}
