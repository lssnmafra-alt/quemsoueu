'use client';

import { RotateCcw, Shuffle } from 'lucide-react';
import AvatarRenderer from '@/components/avatar/AvatarRenderer';
import {
  AVATAR_OPTIONS,
  DEFAULT_AVATAR_CONFIG,
  normalizeAvatarConfig,
  randomAvatarConfig,
  type AvatarConfig,
} from '@/lib/avatarConfig';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type AvatarBuilderProps = {
  value?: AvatarConfig | null;
  onChange: (config: AvatarConfig) => void;
  className?: string;
};

const sections = [
  { key: 'skin', label: 'Pele' },
  { key: 'face', label: 'Rosto' },
  { key: 'eyes', label: 'Olhos' },
  { key: 'hair', label: 'Cabelo' },
  { key: 'clothes', label: 'Roupa' },
  { key: 'accessory', label: 'Acessorio' },
  { key: 'background', label: 'Fundo' },
  { key: 'frame', label: 'Moldura' },
] as const;

export default function AvatarBuilder({ value, onChange, className }: AvatarBuilderProps) {
  const config = normalizeAvatarConfig(value || DEFAULT_AVATAR_CONFIG);

  const update = (patch: Partial<AvatarConfig>) => {
    onChange(normalizeAvatarConfig({ ...config, ...patch }));
  };

  return (
    <div className={cn('grid gap-5 lg:grid-cols-[220px_1fr]', className)}>
      <div className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-3">
        <div className="aspect-[3/4] rounded-xl overflow-hidden border-2 border-white shadow-inner bg-white">
          <AvatarRenderer config={config} />
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <Button
            type="button"
            onClick={() => onChange(randomAvatarConfig())}
            className="h-10 text-[11px] font-black uppercase btn-squishy-indigo text-white"
          >
            <Shuffle className="w-3.5 h-3.5 mr-1" /> Randomizar
          </Button>
          <Button
            type="button"
            onClick={() => onChange(DEFAULT_AVATAR_CONFIG)}
            className="h-10 text-[11px] font-black uppercase bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Resetar
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <ColorField label="Cor do cabelo" value={config.hairColor} onChange={(hairColor) => update({ hairColor })} />
          <ColorField label="Cor da roupa" value={config.clothesColor} onChange={(clothesColor) => update({ clothesColor })} />
        </div>

        <div className="grid gap-4">
          {sections.map((section) => (
            <div key={section.key} className="bg-white border-2 border-slate-100 rounded-2xl p-3">
              <p className="text-[11px] font-black uppercase text-indigo-700 mb-2">{section.label}</p>
              <div className="flex flex-wrap gap-2">
                {AVATAR_OPTIONS[section.key].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => update({ [section.key]: option.id } as Partial<AvatarConfig>)}
                    className={cn(
                      'px-3 h-9 rounded-xl border-2 text-[11px] font-black uppercase transition-colors',
                      config[section.key] === option.id
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-indigo-200',
                    )}
                  >
                    {'color' in option && (
                      <span
                        className="inline-block w-3 h-3 rounded-full mr-1.5 align-[-2px] border border-white/70"
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="bg-white border-2 border-slate-100 rounded-2xl p-3 flex items-center justify-between gap-3">
      <span className="text-[11px] font-black uppercase text-indigo-700">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-12 h-10 rounded-xl border-0 bg-transparent cursor-pointer"
      />
    </label>
  );
}
