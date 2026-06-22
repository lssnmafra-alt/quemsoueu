import type { Metadata } from 'next';
import { Inter, Quicksand } from 'next/font/google';
import './globals.css'; // Global styles
import AdSenseGate from '@/components/AdSenseGate';
import AudioToggle from '@/components/AudioToggle';
import AuthBootstrap from '@/components/AuthBootstrap';
import RoomInviteInbox from '@/components/RoomInviteInbox';
import SocialQuickButton from '@/components/SocialQuickButton';
import { getPublicRuntimeEnvScript } from '@/lib/publicEnv';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const quicksand = Quicksand({ subsets: ['latin'], variable: '--font-quicksand' });

export const metadata: Metadata = {
  metadataBase: new URL('https://quemsoueu-ten.vercel.app'),
  title: 'Quem Sou Eu? Jogo de Cartas',
  description: 'Jogo multiplayer de cartas, personagens e adivinhação social.',
  openGraph: {
    title: 'Quem Sou Eu?',
    description: 'Jogo multiplayer de cartas, personagens e adivinhação social.',
    images: ['/api/branding/loading'],
  },
};

export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${quicksand.variable}`} suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="/mobile-fixes.css" />
        <script
          id="quem-sou-eu-runtime-env"
          dangerouslySetInnerHTML={{ __html: getPublicRuntimeEnvScript() }}
        />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4115543805172090"
          crossOrigin="anonymous"
        />
      </head>
      <body className="font-sans bg-[#f5f6ff] text-indigo-950" suppressHydrationWarning>
        <AuthBootstrap />
        <AdSenseGate />
        {children}
        <AudioToggle />
        <RoomInviteInbox />
        <SocialQuickButton />
      </body>
    </html>
  );
}
