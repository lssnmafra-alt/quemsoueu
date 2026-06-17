import type {Metadata} from 'next';
import { Inter, Quicksand } from 'next/font/google';
import './globals.css'; // Global styles
import AudioToggle from '@/components/AudioToggle';
import AuthBootstrap from '@/components/AuthBootstrap';
import { getPublicRuntimeEnvScript } from '@/lib/publicEnv';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const quicksand = Quicksand({ subsets: ['latin'], variable: '--font-quicksand' });

export const metadata: Metadata = {
  title: 'Quem Sou Eu? Jogo de Cartas',
  description: 'Um divertido jogo social de cartas e adivinhação multiplayer!',
};

export const dynamic = 'force-dynamic';

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable} ${quicksand.variable}`} suppressHydrationWarning>
      <head>
        <script
          id="quem-sou-eu-runtime-env"
          dangerouslySetInnerHTML={{ __html: getPublicRuntimeEnvScript() }}
        />
      </head>
      <body className="font-sans bg-[#f5f6ff] text-indigo-950" suppressHydrationWarning>
        <AuthBootstrap />
        {children}
        <AudioToggle />
      </body>
    </html>
  );
}
