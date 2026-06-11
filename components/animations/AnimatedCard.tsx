'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';

export default function AnimatedCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ y: -3, scale: 1.01 }} transition={{ duration: 0.18 }} className={className}>
      {children}
    </motion.div>
  );
}
