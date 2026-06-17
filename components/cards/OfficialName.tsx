import { cn } from '@/lib/utils';
import type { OfficialCardThemeConfig } from './OfficialFrame';

type OfficialNameProps = {
  name: string;
  theme: OfficialCardThemeConfig;
  showLabel?: boolean;
};

export default function OfficialName({ name, theme, showLabel = false }: OfficialNameProps) {
  return (
    <div className="pointer-events-none absolute inset-x-2 bottom-2 z-30 flex min-h-[2rem] items-end justify-center px-2 pb-1.5 text-center">
      <div className="min-w-0 max-w-full">
        {showLabel && (
          <div className={cn('mb-0.5 text-[7px] font-black uppercase tracking-[0.18em] opacity-90 drop-shadow-md', theme.nameColor)}>
            Oficial
          </div>
        )}
        <p
          className={cn(
            'font-display text-balance break-words text-[clamp(0.62rem,2.75vw,0.9rem)] font-black uppercase leading-[1.02] tracking-[0.085em] drop-shadow-[0_2px_2px_rgba(0,0,0,0.95)]',
            '[text-shadow:0_1px_0_rgba(0,0,0,0.95),0_2px_4px_rgba(0,0,0,0.9),0_0_8px_rgba(255,255,255,0.24)]',
            theme.nameColor,
          )}
        >
          {name}
        </p>
      </div>
    </div>
  );
}
