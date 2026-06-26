'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const styleFiles = [
  '/mobile-base.css',
  '/mobile-nav.css',
  '/mobile-store.css',
  '/mobile-gameplay.css',
  '/mobile-scroll-fix.css',
];

function routeKey(pathname: string) {
  if (!pathname || pathname === '/') return '/';
  const segments = pathname.split('/').filter(Boolean);
  const first = segments[0] || '';
  return first ? `/${first}` : '/';
}

function attachStyles() {
  for (const href of styleFiles) {
    if (document.querySelector(`link[href="${href}"]`)) continue;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }
}

export default function MobileRouteScope() {
  const pathname = usePathname();

  useEffect(() => {
    attachStyles();
    const key = routeKey(pathname || '/');
    document.body.dataset.qseRoute = key;
    document.documentElement.dataset.qseRoute = key;
    document.body.dataset.qseMobileSystem = 'split';

    return () => {
      delete document.body.dataset.qseRoute;
      delete document.documentElement.dataset.qseRoute;
      delete document.body.dataset.qseMobileSystem;
    };
  }, [pathname]);

  return null;
}
