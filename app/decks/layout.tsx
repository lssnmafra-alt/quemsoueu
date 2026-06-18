import GeminiDeckImagePanel from '@/components/GeminiDeckImagePanel';

export default function DecksLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <GeminiDeckImagePanel />
    </>
  );
}
