'use client';

import { motion } from 'motion/react';
import { Target, Shield, Sparkles } from 'lucide-react';

const icons = {
  attack: Target,
  defense: Shield,
  victory: Sparkles,
};

export default function ActionAnimation({ type = 'attack', label }: { type?: keyof typeof icons; label?: string }) {
  const Icon = icons[type];

  return (
    <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="pointer-events-none inline-flex items-center gap-2 rounded-2xl border-2 border-indigo-100 bg-white px-4 py-2 text-xs font-black uppercase text-indigo-950 shadow-lg">
      <motion.span animate={{ rotate: type === 'attack' ? [0, -8, 8, 0] : 0, scale: [1, 1.08, 1] }} transition={{ duration: 0.5, repeat: 1 }}>
        <Icon className="h-4 w-4 text-indigo-500" />
      </motion.span>
      {label}
    </motion.div>
  );
}
