'use client';

import { useMemo, useState } from 'react';
import { Palette, RotateCcw, Shuffle, Sparkles } from 'lucide-react';
import AvatarRenderer from '@/components/avatar/AvatarRenderer';
import {
  AVATAR_OPTIONS,
  AVATAR_PRESETS,
  DEFAULT_AVATAR_CONFIG,
  normalizeAvatarConfig,
  randomAvatarConfig,
  type AvatarConfig,
} from '@/lib/avatarConfig';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type AvatarBuilderProps = {
  value?: AvatarConfig | null;
  name?: string;
  onChange: (config: AvatarConfig) => void;
  className?: string;
};

const sections = [
  { key: 'skin', label: 'Pele', hint: 'humano, monstro, alien' },
  { key: 'face', label: 'Base', hint: 'silhueta do rosto' },
  { key: 'eyes', label: 'Olhos', hint: 'emoção e máscara' },
  { key: 'hair', label: 'Cabelo', hint: 'corte ou capuz' },
  { key: 'clothes', label: 'Roupa', hint: 'arquétipo visual' },
  { key: 'accessory', label: 'Extra', hint: 'símbolo marcante' },
  { key: 'background', label: 'Cena', hint: 'clima do card' },
  { key: 'frame', label: 'Moldura', hint: 'raridade e tema' },
] as const;

type SectionKey = (typeof sections)[number]['key'];

export default function AvatarBuilder({ value, name, onChange, className }: AvatarBuilderProps) {
  const config = normalizeAvatarConfig(value || DEFAULT_AVATAR_CONFIG);
  const [active, setActive] = useState<SectionKey>('clothes');

  const activeSection = useMemo(() => sections.find((section) => section.key === active) || sections[0], [active]);

  const update = (patch: Partial<AvatarConfig>) => {
    onChange(normalizeAvatarConfig({ ...config, ...patch }));
  };

  return (
    <div className={cn('grid gap-4 lg:grid-cols-[240px_1fr] items-start', className)}>
      <div className="lg:sticky lg:top-4 bg-slate-950 rounded-2xl p-3 shadow-lg border-2 border-indigo-100">
        <div className="aspect-[3/4] rounded-xl overflow-hidden bg-white border-2 border-white/20">
          <AvatarRenderer config={config} name={name || 'Personagem'} />
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <Button
            type="button"
            onClick={() => onChange(randomAvatarConfig())}
            className="h-10 text-[11px] font-black uppercase bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Shuffle className="w-3.5 h-3.5 mr-1" /> Random
          </Button>
          <Button
            type="button"
            onClick={() => onChange(DEFAULT_AVATAR_CONFIG)}
            className="h-10 text-[11px] font-black uppercase bg-white/10 border border-white/15 text-white hover:bg-white/15"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
          </Button>
        </div>
      </div>

      <div className="min-w-0 bg-white border-2 border-slate-100 rounded-2xl overflow-hidden">
        <div className="p-3 border-b-2 border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <p className="text-xs font-black uppercase text-indigo-950">Presets rápidos</p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {AVATAR_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onChange(preset.config)}
                className="h-10 px-3 rounded-xl bg-white border-2 border-slate-100 hover:border-indigo-300 text-[11px] font-black uppercase text-slate-700 shrink-0"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-[168px_1fr]">
          <div className="border-b-2 md:border-b-0 md:border-r-2 border-slate-100 bg-slate-50/60 p-2">
            <div className="grid grid-cols-4 md:grid-cols-1 gap-2">
              {sections.map((section) => (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => setActive(section.key)}
                  className={cn(
                    'text-left rounded-xl border-2 px-3 py-2 transition-colors',
                    active === section.key
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-600 border-slate-100 hover:border-indigo-200',
                  )}
                >
                  <span className="block text-[11px] font-black uppercase truncate">{section.label}</span>
                  <span className={cn('hidden md:block text-[10px] font-bold truncate', active === section.key ? 'text-indigo-100' : 'text-slate-400')}>
                    {section.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 md:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <p className="text-sm font-black uppercase text-indigo-950">{activeSection.label}</p>
                <p className="text-[11px] font-bold text-slate-400">{activeSection.hint}</p>
              </div>

              {(active === 'hair' || active === 'clothes') && (
                <ColorField
                  label={active === 'hair' ? 'Cor do cabelo' : 'Cor da roupa'}
                  value={active === 'hair' ? config.hairColor : config.clothesColor}
                  onChange={(color) => update(active === 'hair' ? { hairColor: color } : { clothesColor: color })}
                />
              )}
            </div>

            <div className="max-h-[360px] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
                {AVATAR_OPTIONS[active].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => update({ [active]: option.id } as Partial<AvatarConfig>)}
                    className={cn(
                      'min-h-12 rounded-xl border-2 px-3 py-2 text-left transition-colors',
                      config[active] === option.id
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 text-slate-700 border-slate-100 hover:border-indigo-200',
                    )}
                  >
                    <span className="flex items-center gap-2 text-[11px] font-black uppercase">
                      {'color' in option && (
                        <span
                          className="inline-block w-4 h-4 rounded-full border border-white/70 shrink-0"
                          style={{ backgroundColor: option.color }}
                        />
                      )}
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="h-10 bg-white border-2 border-slate-100 rounded-xl px-2 flex items-center justify-between gap-2 min-w-[180px]">
      <span className="text-[10px] font-black uppercase text-indigo-700 flex items-center gap-1">
        <Palette className="w-3 h-3" /> {label}
      </span>
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-9 h-8 rounded-lg border-0 bg-transparent cursor-pointer"
      />
    </label>
  );
}
