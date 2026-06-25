'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

function routeKey(pathname: string) {
  if (!pathname || pathname === '/') return '/';
  const segments = pathname.split('/').filter(Boolean);
  const first = segments[0] || '';
  return first ? `/${first}` : '/';
}

export default function MobileRouteScope() {
  const pathname = usePathname();

  useEffect(() => {
    const key = routeKey(pathname || '/');
    document.body.dataset.qseRoute = key;
    document.documentElement.dataset.qseRoute = key;

    return () => {
      delete document.body.dataset.qseRoute;
      delete document.documentElement.dataset.qseRoute;
    };
  }, [pathname]);

  return null;
}
