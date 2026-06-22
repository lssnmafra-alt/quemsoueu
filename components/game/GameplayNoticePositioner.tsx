'use client';

import { useEffect } from 'react';

export default function GameplayNoticePositioner() {
  useEffect(() => {
    const timers = new WeakMap<Element, number>();

    const apply = () => {
      const stack = document.querySelector('.fixed.right-4.top-20') as HTMLElement | null;
      if (!stack) return;

      stack.style.top = 'auto';
      stack.style.right = window.innerWidth < 640 ? '0.7rem' : '0.75rem';
      stack.style.bottom = window.innerWidth < 640 ? '5.4rem' : '5.75rem';
      stack.style.alignItems = 'flex-end';
      stack.style.maxWidth = 'min(22rem, calc(100vw - 1.5rem))';

      Array.from(stack.children).forEach((child) => {
        const item = child as HTMLElement;
        item.style.maxWidth = window.innerWidth < 640 ? '78vw' : 'min(22rem, calc(100vw - 1.5rem))';
        item.style.transition = 'opacity 240ms ease, transform 240ms ease';

        if (window.innerWidth < 640) {
          item.style.padding = '0.65rem 0.8rem';
          item.style.borderRadius = '1rem';
          item.style.fontSize = '0.68rem';
          item.style.lineHeight = '1.15';
        }

        if (!timers.has(item)) {
          const timer = window.setTimeout(() => {
            item.style.opacity = '0';
            item.style.transform = 'translateX(1rem) scale(0.96)';
            item.style.visibility = 'hidden';
          }, 4000);
          timers.set(item, timer);
        }
      });
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', apply);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', apply);
    };
  }, []);

  return null;
}
