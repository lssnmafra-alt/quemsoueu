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
  type AvatarCategory,
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

type BuilderGroup = {
  id: string;
  label: string;
  categories: Array<{ key: AvatarCategory; label: string; hint: string }>;
};

const groups: BuilderGroup[] = [
  {
    id: 'identity',
    label: 'Identidade',
    categories: [
      { key: 'skin', label: 'Tom de pele', hint: 'humano, monstro, metal' },
      { key: 'body', label: 'Corpo', hint: 'porte e presença' },
      { key: 'background', label: 'Cena', hint: 'clima do card' },
      { key: 'frame', label: 'Moldura', hint: 'raridade e tema' },
    ],
  },
  {
    id: 'head',
    label: 'Cabeça',
    categories: [
      { key: 'face', label: 'Modelo do rosto', hint: 'silhueta e mandíbula' },
      { key: 'eyes', label: 'Olhos', hint: 'olhar, visor e óculos' },
      { key: 'eyebrows', label: 'Sobrancelha', hint: 'expressão' },
      { key: 'nose', label: 'Nariz', hint: 'perfil e marcação' },
      { key: 'mouth', label: 'Boca', hint: 'humor e atitude' },
      { key: 'facialHair', label: 'Barba', hint: 'bigode, cavanhaque, cheia' },
    ],
  },
  {
    id: 'hair',
    label: 'Penteado',
    categories: [
      { key: 'hair', label: 'Corte', hint: 'cabelo, capuz ou careca' },
      { key: 'headwear', label: 'Cabeça extra', hint: 'boné, capacete, marca' },
    ],
  },
  {
    id: 'outfit',
    label: 'Roupa',
    categories: [
      { key: 'clothes', label: 'Roupa base', hint: 'uniforme, bruxo, tech' },
      { key: 'outerwear', label: 'Camada', hint: 'manto, capa, jaqueta' },
      { key: 'accessory', label: 'Objeto', hint: 'varinha, tridente, câmera' },
    ],
  },
] as const;

const flatCategories = groups.flatMap((group) => group.categories);

export default function AvatarBuilder({ value, name, onChange, className }: AvatarBuilderProps) {
  const config = normalizeAvatarConfig(value || DEFAULT_AVATAR_CONFIG);
  const [activeGroup, setActiveGroup] = useState(groups[1].id);
  const [active, setActive] = useState<AvatarCategory>('face');

  const visibleGroup = groups.find((group) => group.id === activeGroup) || groups[0];
  const activeCategory = useMemo(() => flatCategories.find((category) => category.key === active) || flatCategories[0], [active]);

  const update = (patch: Partial<AvatarConfig>) => {
    onChange(normalizeAvatarConfig({ ...config, ...patch }));
  };

  const chooseGroup = (group: BuilderGroup) => {
    setActiveGroup(group.id);
    if (!group.categories.some((category) => category.key === active)) {
      setActive(group.categories[0].key);
    }
  };

  return (
    <div className={cn('grid gap-3 xl:grid-cols-[188px_1fr] items-start', className)}>
      <div className="xl:sticky xl:top-4 bg-slate-950 rounded-2xl p-2 shadow-lg border-2 border-indigo-100">
        <div className="aspect-[3/4] max-h-[242px] mx-auto rounded-xl overflow-hidden bg-white border-2 border-white/20">
          <AvatarRenderer config={config} name={name || 'Personagem'} />
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2">
          <Button
            type="button"
            onClick={() => onChange(randomAvatarConfig())}
            className="h-9 text-[10px] font-black uppercase bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Shuffle className="w-3.5 h-3.5 mr-1" /> Random
          </Button>
          <Button
            type="button"
            onClick={() => onChange(DEFAULT_AVATAR_CONFIG)}
            className="h-9 text-[10px] font-black uppercase bg-white/10 border border-white/15 text-white hover:bg-white/15"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
          </Button>
        </div>
      </div>

      <div className="min-w-0 bg-white border-2 border-slate-100 rounded-2xl overflow-hidden">
        <div className="p-3 border-b-2 border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <p className="text-xs font-black uppercase text-indigo-950">Presets rápidos</p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {AVATAR_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onChange(preset.config)}
                className="h-9 px-3 rounded-xl bg-white border-2 border-slate-100 hover:border-indigo-300 text-[10px] font-black uppercase text-slate-700 shrink-0"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-b-2 border-slate-100 bg-white px-3 py-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {groups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => chooseGroup(group)}
                className={cn(
                  'h-10 rounded-xl border-2 px-3 text-[11px] font-black uppercase transition-colors',
                  activeGroup === group.id
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-indigo-200',
                )}
              >
                {group.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-[168px_1fr]">
          <div className="border-b-2 lg:border-b-0 lg:border-r-2 border-slate-100 bg-slate-50/60 p-2">
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
              {visibleGroup.categories.map((category) => (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => setActive(category.key)}
                  className={cn(
                    'text-left rounded-xl border-2 px-3 py-2 transition-colors',
                    active === category.key
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-600 border-slate-100 hover:border-indigo-200',
                  )}
                >
                  <span className="block text-[11px] font-black uppercase truncate">{category.label}</span>
                  <span className={cn('hidden xl:block text-[10px] font-bold truncate', active === category.key ? 'text-indigo-100' : 'text-slate-400')}>
                    {category.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <div>
                <p className="text-sm font-black uppercase text-indigo-950">{activeCategory.label}</p>
                <p className="text-[11px] font-bold text-slate-400">{activeCategory.hint}</p>
              </div>

              {(active === 'hair' || active === 'clothes') && (
                <ColorField
                  label={active === 'hair' ? 'Cor do cabelo' : 'Cor da roupa'}
                  value={active === 'hair' ? config.hairColor : config.clothesColor}
                  onChange={(color) => update(active === 'hair' ? { hairColor: color } : { clothesColor: color })}
                />
              )}
            </div>

            <div className="max-h-[240px] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
                {AVATAR_OPTIONS[active].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => update({ [active]: option.id } as Partial<AvatarConfig>)}
                    className={cn(
                      'min-h-10 rounded-xl border-2 px-3 py-2 text-left transition-colors',
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
