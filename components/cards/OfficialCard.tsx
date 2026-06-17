'use client';

import { cn } from '@/lib/utils';
import OfficialFrame, { getOfficialFrameTheme, type OfficialCardTheme } from './OfficialFrame';
import OfficialName from './OfficialName';

type OfficialCardProps = {
  name: string;
  theme?: OfficialCardTheme;
  className?: string;
};

export default function OfficialCard({ name, theme = 'celestial', className }: OfficialCardProps) {
  const themeConfig = getOfficialFrameTheme(theme);

  return (
    <div className={cn('official-card-preview relative overflow-hidden rounded-[1.35rem] border-[3px] shadow-xl', themeConfig.border, themeConfig.base, className)}>
      <div className="absolute inset-[0.22rem] rounded-[0.95rem] bg-slate-900" />
      <OfficialFrame theme={theme} />
      <OfficialName name={name} theme={themeConfig} />
    </div>
  );
}
