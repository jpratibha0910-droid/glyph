import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#09090b',
};

export const metadata: Metadata = {
  title: 'GlyphCraft Studio — In-Browser Custom Font Creator (.ttf & .woff2)',
  description:
    'Draw custom glyphs, vectorize strokes into bezier curves, adjust baselines and side-bearings, test via real-time @font-face preview, and export .ttf & .woff2 fonts.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'GlyphCraft',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} dark h-full antialiased`}>
      <body className="h-full w-full flex flex-col bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 safe-top safe-bottom safe-left safe-right">
        {children}
      </body>
    </html>
  );
}
