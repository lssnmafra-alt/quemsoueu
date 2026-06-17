import { cn } from '@/lib/utils';
import type { OfficialCardThemeConfig } from './OfficialFrame';

type OfficialNameProps = {
  name: string;
  theme: OfficialCardThemeConfig;
  showLabel?: boolean;
};

export default function OfficialName({ name, theme, showLabel = false }: OfficialNameProps) {
  const displayName = name.trim();
  const words = displayName.split(/\s+/).filter(Boolean);
  const isLikelyTwoLineName = words.length > 1 && displayName.length >= 13;

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-1.5 z-30 flex items-end justify-center text-center',
        isLikelyTwoLineName ? 'bottom-[0.42rem] min-h-[1.85rem] px-1.5 pb-1' : 'bottom-2 min-h-[1.6rem] px-2 pb-1.5',
      )}
    >
      <div className="min-w-0 max-w-full">
        {showLabel && (
          <div className={cn('mb-0.5 text-[7px] font-black uppercase tracking-[0.18em] opacity-90 drop-shadow-md', theme.nameColor)}>
            Oficial
          </div>
        )}
        <p
          className={cn(
            'font-display text-balance hyphens-none whitespace-normal font-black uppercase drop-shadow-[0_2px_2px_rgba(0,0,0,0.95)]',
            '[word-break:normal] [overflow-wrap:normal] [text-wrap:balance]',
            '[text-shadow:0_1px_0_rgba(0,0,0,0.95),0_2px_4px_rgba(0,0,0,0.9),0_0_8px_rgba(255,255,255,0.24)]',
            isLikelyTwoLineName
              ? 'text-[clamp(0.46rem,2vw,0.7rem)] leading-[0.92] tracking-[0.032em]'
              : 'text-[clamp(0.54rem,2.35vw,0.84rem)] leading-[1.02] tracking-[0.045em]',
            theme.nameColor,
          )}
        >
          {displayName}
        </p>
      </div>
    </div>
  );
}
