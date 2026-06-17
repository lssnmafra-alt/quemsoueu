import { cn } from '@/lib/utils';

export type OfficialCardTheme = 'arcane' | 'nature' | 'ruby' | 'shadow' | 'celestial';

export type OfficialCardThemeConfig = {
  border: string;
  base: string;
  innerBorder: string;
  cornerBorder: string;
  nameColor: string;
};

export function getOfficialFrameTheme(theme: OfficialCardTheme = 'celestial'): OfficialCardThemeConfig {
  if (theme === 'arcane') {
    return {
      border: 'border-violet-400',
      base: 'bg-violet-950',
      innerBorder: 'border-violet-100/75',
      cornerBorder: 'border-violet-100/90',
      nameColor: 'text-violet-50',
    };
  }

  if (theme === 'nature') {
    return {
      border: 'border-emerald-400',
      base: 'bg-emerald-950',
      innerBorder: 'border-emerald-100/75',
      cornerBorder: 'border-emerald-100/90',
      nameColor: 'text-emerald-50',
    };
  }

  if (theme === 'shadow') {
    return {
      border: 'border-zinc-400',
      base: 'bg-zinc-950',
      innerBorder: 'border-zinc-100/70',
      cornerBorder: 'border-zinc-100/85',
      nameColor: 'text-zinc-50',
    };
  }

  return {
    border: 'border-amber-300',
    base: 'bg-slate-950',
    innerBorder: 'border-amber-100/75',
    cornerBorder: 'border-amber-100/90',
    nameColor: 'text-amber-50',
  };
}

export default function OfficialFrame({ theme = 'celestial' }: { theme?: OfficialCardTheme }) {
  const config = getOfficialFrameTheme(theme);

  return (
    <>
      <div className={cn('pointer-events-none absolute inset-0 z-10 rounded-[1.35rem] border-[3px]', config.border)} />
      <div className={cn('pointer-events-none absolute inset-1 z-10 rounded-[1rem] border', config.innerBorder)} />
      <div className="pointer-events-none absolute inset-2 z-10 rounded-[0.82rem] border border-slate-950/35" />
      <div className={cn('pointer-events-none absolute left-2 top-2 z-10 h-5 w-5 rounded-tl-xl border-l-2 border-t-2', config.cornerBorder)} />
      <div className={cn('pointer-events-none absolute right-2 top-2 z-10 h-5 w-5 rounded-tr-xl border-r-2 border-t-2', config.cornerBorder)} />
      <div className={cn('pointer-events-none absolute bottom-2 left-2 z-10 h-5 w-5 rounded-bl-xl border-b-2 border-l-2', config.cornerBorder)} />
      <div className={cn('pointer-events-none absolute bottom-2 right-2 z-10 h-5 w-5 rounded-br-xl border-b-2 border-r-2', config.cornerBorder)} />
      <div className={cn('pointer-events-none absolute bottom-3 left-1/2 z-10 h-3 w-10 -translate-x-1/2 rounded-full border-t', config.cornerBorder)} />
    </>
  );
}
