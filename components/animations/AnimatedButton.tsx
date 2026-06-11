'use client';

import { motion } from 'motion/react';
import type { ComponentProps, ReactNode } from 'react';

type AnimatedButtonProps = ComponentProps<typeof motion.button> & { children: ReactNode };

export default function AnimatedButton({ children, className = '', ...props }: AnimatedButtonProps) {
  return (
    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }} transition={{ duration: 0.14 }} className={className} {...props}>
      {children}
    </motion.button>
  );
}
