import type { Metadata } from 'next';
import { Inter, Quicksand } from 'next/font/google';
import './globals.css'; // Global styles
import AdSenseGate from '@/components/AdSenseGate';
import AudioToggle from '@/components/AudioToggle';
import AuthBootstrap from '@/components/AuthBootstrap';
import GameplayNoticePositioner from '@/components/game/GameplayNoticePositioner';
import RoomAvatarSync from '@/components/game/RoomAvatarSync';
import MobileLandscapeGuard from '@/components/MobileLandscapeGuard';
import MobileRouteScope from '@/components/MobileRouteScope';
import RoomInviteInbox from '@/components/RoomInviteInbox';
import SocialQuickButton from '@/components/SocialQuickButton';
import { getPublicRuntimeEnvScript } from '@/lib/publicEnv';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const quicksand = Quicksand({ subsets: ['latin'], variable: '--font-quicksand' });

const appIconUrl = 'https://pub-4d821b89efc9463aa72b858924e1be7a.r2.dev/atuem/Icob/17A1FF7E-0AFA-4D32-BE07-4C5C4B0C1045.png';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.quemsoueu.cards'),
  title: 'Quem Sou Eu? Jogo de Cartas',
  description: 'Jogo multiplayer de cartas, personagens e adivinhação social.',
  icons: {
    icon: [{ url: appIconUrl, type: 'image/png' }],
    shortcut: [appIconUrl],
    apple: [{ url: appIconUrl, type: 'image/png' }],
  },
  openGraph: {
    title: 'Quem Sou Eu?',
    description: 'Jogo multiplayer de cartas, personagens e adivinhação social.',
    images: [{ url: appIconUrl, width: 512, height: 512, alt: 'Quem Sou Eu?' }],
  },
  twitter: {
    card: 'summary',
    title: 'Quem Sou Eu?',
    description: 'Jogo multiplayer de cartas, personagens e adivinhação social.',
    images: [appIconUrl],
  },
};

export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${quicksand.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" href={appIconUrl} type="image/png" />
        <link rel="shortcut icon" href={appIconUrl} type="image/png" />
        <link rel="apple-touch-icon" href={appIconUrl} />
        <meta name="theme-color" content="#071a64" />
        <link rel="stylesheet" href="/gameplay-polish.css" />
        <link rel="stylesheet" href="/mobile-landscape-guard.css" />
        <link rel="stylesheet" href="/mobile-base.css" />
        <link rel="stylesheet" href="/mobile-screens.css" />
        <link rel="stylesheet" href="/mobile-nav.css" />
        <link rel="stylesheet" href="/mobile-store.css" />
        <link rel="stylesheet" href="/mobile-gameplay.css" />
        <link rel="stylesheet" href="/mobile-scroll-fix.css" />
        <script
          id="quem-sou-eu-runtime-env"
          dangerouslySetInnerHTML={{ __html: getPublicRuntimeEnvScript() }}
        />
        <script src="/avatar-chroma-runtime.js" defer />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2251564645159029"
          crossOrigin="anonymous"
        />
      </head>
      <body className="font-sans bg-[#f5f6ff] text-indigo-950" suppressHydrationWarning>
        <MobileRouteScope />
        <AuthBootstrap />
        <AdSenseGate />
        <GameplayNoticePositioner />
        <RoomAvatarSync />
        {children}
        <AudioToggle />
        <RoomInviteInbox />
        <SocialQuickButton />
        <MobileLandscapeGuard />
      </body>
    </html>
  );
}
