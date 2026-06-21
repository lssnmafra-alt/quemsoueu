'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingArena from '@/components/LoadingArena';

export default function DecksPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/lobby');
  }, [router]);

  return <LoadingArena label="Abrindo biblioteca de decks..." />;
}
