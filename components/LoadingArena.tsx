'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import AvatarFigure from '@/components/avatar/AvatarFigure';
import { DEFAULT_AVATAR_SELECTION, avatarSelectionToUrl } from '@/lib/avatars';

const phrases = [
  'Preparando a arena...',
  'Chamando os jogadores...',
  'Embaralhando o caos...',
  'Carregando votacao...',
  'Ajustando os avatares...',
  'Iniciando o Mata-Mata...',
];

export default function LoadingArena({ label }: { label?: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((current) => (current + 1) % phrases.length), 1400);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#171923] flex items-center justify-center p-6 text-white">
      <div className="w-full max-w-sm text-center">
        <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 0.85, repeat: Infinity, ease: 'easeInOut' }} className="mx-auto mb-6 w-28">
          <AvatarFigure avatarUrl={avatarSelectionToUrl(DEFAULT_AVATAR_SELECTION)} label="Mata-Mata" className="h-28 w-28 rounded-3xl border-4 border-indigo-300 bg-white" state="walk" />
        </motion.div>
        <h1 className="mb-3 font-display text-3xl font-black">Mata-Mata</h1>
        <p className="mb-5 text-sm font-bold uppercase tracking-wider text-indigo-200">{label || phrases[index]}</p>
        <div className="h-3 overflow-hidden rounded-full border border-white/10 bg-white/10">
          <motion.div
            className="h-full rounded-full bg-amber-400"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
            style={{ width: '55%' }}
          />
        </div>
      </div>
    </div>
  );
}
