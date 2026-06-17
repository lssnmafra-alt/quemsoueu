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
      <div className="min-w-0">
        {showLabel && (
          <div className={cn('mb-0.5 text-[7px] font-black uppercase tracking-[0.14em] drop-shadow-lg', theme.nameColor)}>
            Oficial
          </div>
        )}
        <p
          className={cn(
            'text-balance break-words text-[clamp(0.58rem,2.65vw,0.84rem)] font-black uppercase leading-[1.03] tracking-[0.05em] drop-shadow-lg',
            theme.nameColor,
          )}
        >
          {name}
        </p>
      </div>
    </div>
  );
}
