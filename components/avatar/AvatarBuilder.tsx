'use client';

import { useMemo, useState } from 'react';
import {
  ChevronDown,
  Crown,
  Palette,
  RotateCcw,
  Shirt,
  Shuffle,
  Sparkles,
  UserRound,
  WandSparkles,
} from 'lucide-react';
import AvatarRenderer from '@/components/avatar/AvatarRenderer';
import {
  AVATAR_OPTIONS,
  AVATAR_HAIRLINE_OPTIONS,
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
  icon: typeof UserRound;
  categories: Array<{ key: AvatarCategory; label: string; hint: string }>;
};

const groups: BuilderGroup[] = [
  {
    id: 'identity',
    label: 'Identidade',
    icon: UserRound,
    categories: [
      { key: 'skin', label: 'Tom de pele', hint: 'base humana, fantasia ou metal' },
      { key: 'body', label: 'Corpo', hint: 'silhueta e porte do personagem' },
      { key: 'face', label: 'Formato', hint: 'estrutura do rosto e queixo' },
    ],
  },
  {
    id: 'head',
    label: 'Cabeca',
    icon: Sparkles,
    categories: [
      { key: 'eyes', label: 'Olhos', hint: 'olhar, visor, oculos e intensidade' },
      { key: 'eyebrows', label: 'Sobrancelhas', hint: 'expressao do personagem' },
      { key: 'nose', label: 'Nariz', hint: 'perfil e marcacao facial' },
      { key: 'mouth', label: 'Boca', hint: 'atitude e humor' },
      { key: 'marking', label: 'Marcas', hint: 'cicatriz, pintura, tatuagem e detalhes' },
      { key: 'facialHair', label: 'Barba', hint: 'estilo facial opcional' },
    ],
  },
  {
    id: 'hair',
    label: 'Cabelo',
    icon: WandSparkles,
    categories: [
      { key: 'hair', label: 'Penteado', hint: 'topo, volume, franja e comprimento' },
      { key: 'hairSide', label: 'Lateral', hint: 'fade, taper, risco, undercut ou longo' },
      { key: 'headwear', label: 'Cabeca extra', hint: 'bone, coroa, capacete ou marca' },
    ],
  },
  {
    id: 'outfit',
    label: 'Roupa',
    icon: Shirt,
    categories: [
      { key: 'clothes', label: 'Roupa base', hint: 'traje principal do personagem' },
      { key: 'outerwear', label: 'Camada', hint: 'capa, jaqueta, manto ou armor' },
    ],
  },
  {
    id: 'extras',
    label: 'Acessorios',
    icon: Crown,
    categories: [
      { key: 'accessory', label: 'Acessorio', hint: 'item visual independente' },
      { key: 'aura', label: 'Aura', hint: 'iluminacao e energia ao redor' },
      { key: 'background', label: 'Fundo', hint: 'cenario e atmosfera do card' },
      { key: 'frame', label: 'Moldura', hint: 'acabamento premium do preview' },
    ],
  },
];

const flatCategories = groups.flatMap((group) => group.categories);

export default function AvatarBuilder({ value, name, onChange, className }: AvatarBuilderProps) {
  const config = normalizeAvatarConfig(value || DEFAULT_AVATAR_CONFIG);
  const [activeGroup, setActiveGroup] = useState(groups[0].id);
  const [active, setActive] = useState<AvatarCategory>('skin');
  const [showPresets, setShowPresets] = useState(false);

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

  const applyPreset = (presetConfig: AvatarConfig) => {
    onChange(normalizeAvatarConfig(presetConfig));
  };

  return (
    <div className={cn('w-full max-w-full overflow-hidden rounded-[1.25rem] border border-white/10 bg-slate-950 shadow-2xl shadow-indigo-950/30 sm:rounded-[2rem]', className)}>
      <div className="relative max-w-full overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.32),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.22),_transparent_34%),linear-gradient(135deg,_#020617,_#0f172a_45%,_#111827)] p-2 sm:p-4 lg:p-5">
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="relative grid min-w-0 max-w-full items-start gap-2.5 sm:gap-4 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
          <aside className="min-w-0 max-w-full xl:sticky xl:top-4">
            <div className="mx-auto w-full max-w-[210px] rounded-[1.2rem] border border-white/15 bg-white/[0.07] p-1.5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:max-w-[320px] sm:rounded-[1.7rem] sm:p-2 xl:max-w-none">
              <div className="relative w-full overflow-hidden rounded-[1rem] border border-white/15 bg-slate-950 sm:rounded-[1.35rem]">
                <AvatarRenderer config={config} name={name || 'Personagem'} className="w-full min-w-0 max-w-full" />
              </div>
            </div>

            <div className="mx-auto mt-2 grid w-full max-w-[320px] grid-cols-2 gap-2 xl:mt-3 xl:max-w-none">
              <Button
                type="button"
                onClick={() => onChange(randomAvatarConfig())}
                className="h-11 rounded-2xl border border-cyan-300/30 bg-cyan-400/15 text-cyan-50 shadow-lg shadow-cyan-950/20 hover:bg-cyan-400/25 font-black uppercase text-[11px] tracking-wide"
              >
                <Shuffle className="w-4 h-4 mr-1.5" /> Random
              </Button>
              <Button
                type="button"
                onClick={() => onChange(DEFAULT_AVATAR_CONFIG)}
                className="h-11 rounded-2xl border border-white/15 bg-white/10 text-white hover:bg-white/15 font-black uppercase text-[11px] tracking-wide"
              >
                <RotateCcw className="w-4 h-4 mr-1.5" /> Reset
              </Button>
            </div>

            <div className="mx-auto mt-2 w-full max-w-[360px] rounded-2xl border border-white/10 bg-white/[0.06] p-2.5 backdrop-blur-xl sm:mt-3 sm:rounded-3xl sm:p-3 xl:max-w-none">
              <button
                type="button"
                onClick={() => setShowPresets((current) => !current)}
                className="flex w-full items-center justify-between gap-2 text-white xl:pointer-events-none"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span className="text-[11px] font-black uppercase tracking-[0.2em]">Presets premium</span>
                </span>
                <ChevronDown className={cn('h-4 w-4 text-slate-300 transition-transform xl:hidden', showPresets && 'rotate-180')} />
              </button>
              <div className={cn('mt-3 gap-2 overflow-x-auto pb-1 xl:grid xl:max-h-[178px] xl:grid-cols-2 xl:overflow-y-auto xl:pr-1', showPresets ? 'flex' : 'hidden xl:grid')}>
                {AVATAR_PRESETS.map((presetItem) => (
                  <button
                    key={presetItem.id}
                    type="button"
                    onClick={() => applyPreset(presetItem.config)}
                    className="h-10 shrink-0 rounded-2xl border border-white/10 bg-white/10 px-3 text-left text-[10px] font-black uppercase tracking-wide text-slate-100 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 xl:w-full"
                  >
                    {presetItem.label}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <section className="min-w-0 max-w-full rounded-[1.35rem] border border-white/10 bg-white/[0.08] shadow-2xl shadow-black/20 backdrop-blur-xl sm:rounded-[1.7rem]">
            <div className="border-b border-white/10 p-2.5 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="hidden sm:block">
                  <p className="text-[9px] font-black uppercase tracking-[0.24em] text-cyan-200 sm:text-[10px] sm:tracking-[0.35em]">Avatar Studio</p>
                  <h3 className="mt-1 text-lg font-black uppercase tracking-tight text-white sm:text-2xl">Criador de personagem</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-300">Monte um visual original em camadas, pronto para card de jogo.</p>
                </div>
                <div className="hidden rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-emerald-100 sm:block">
                  SVG sem imagem externa
                </div>
              </div>

              <div className="flex snap-x gap-2 overflow-x-auto pb-1 sm:mt-4 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 lg:grid-cols-5">
                {groups.map((group) => {
                  const Icon = group.icon;
                  const isActive = activeGroup === group.id;

                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => chooseGroup(group)}
                      className={cn(
                        'group flex h-11 min-w-[124px] snap-start items-center gap-2 rounded-2xl border px-2.5 text-left transition-all sm:h-14 sm:min-w-0 sm:px-3',
                        isActive
                          ? 'border-cyan-300/60 bg-cyan-300/15 text-white shadow-lg shadow-cyan-950/30'
                          : 'border-white/10 bg-white/[0.06] text-slate-300 hover:border-white/25 hover:bg-white/[0.1]',
                      )}
                    >
                      <span className={cn('flex h-7 w-7 items-center justify-center rounded-xl border sm:h-8 sm:w-8', isActive ? 'border-cyan-200/40 bg-cyan-200/20 text-cyan-100' : 'border-white/10 bg-white/5 text-slate-400')}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[11px] font-black uppercase tracking-wide">{group.label}</span>
                        <span className="hidden truncate text-[10px] font-bold text-slate-400 sm:block">{group.categories.length} camadas</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid min-w-0 lg:min-h-[430px] lg:grid-cols-[220px_minmax(0,1fr)]">
              <div className="min-w-0 border-b border-white/10 bg-black/10 p-2.5 sm:p-3 lg:border-b-0 lg:border-r">
                <div className="flex snap-x gap-2 overflow-x-auto pb-1 lg:grid lg:grid-cols-1 lg:overflow-visible lg:pb-0">
                  {visibleGroup.categories.map((category) => (
                    <button
                      key={category.key}
                      type="button"
                      onClick={() => setActive(category.key)}
                      className={cn(
                        'min-w-[120px] snap-start rounded-2xl border px-3 py-2 text-left transition-all lg:min-w-0 lg:py-3',
                        active === category.key
                          ? 'border-indigo-300/60 bg-indigo-400/20 text-white shadow-lg shadow-indigo-950/30'
                          : 'border-white/10 bg-white/[0.06] text-slate-300 hover:border-white/25 hover:bg-white/[0.1]',
                      )}
                    >
                      <span className="block text-[11px] font-black uppercase tracking-wide">{category.label}</span>
                      <span className={cn('mt-0.5 hidden text-[10px] font-semibold leading-snug lg:block', active === category.key ? 'text-indigo-100' : 'text-slate-400')}>
                        {category.hint}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-w-0 max-w-full p-2.5 sm:p-4">
                <div className="mb-3 flex min-w-0 flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.06] p-3 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase tracking-wide text-white">{activeCategory.label}</p>
                    <p className="text-[11px] font-semibold text-slate-400">{activeCategory.hint}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {active === 'hair' && (
                      <ColorField label="Cor do cabelo" value={config.hairColor} onChange={(color) => update({ hairColor: color })} />
                    )}
                    {active === 'clothes' && (
                      <ColorField label="Cor da roupa" value={config.clothesColor} onChange={(color) => update({ clothesColor: color })} />
                    )}
                  </div>
                </div>

                <div className="max-h-[48vh] min-h-[220px] overflow-y-auto pr-1 sm:max-h-[410px] sm:min-h-[260px]">
                  {active === 'hair' && (
                    <div className="mb-3 rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-3">
                      <div className="mb-2">
                        <p className="text-[11px] font-black uppercase tracking-wide text-cyan-100">Linha do cabelo</p>
                        <p className="text-[10px] font-semibold text-slate-300">Preenche a testa sem descer o penteado para cima dos olhos.</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {AVATAR_HAIRLINE_OPTIONS.map((option) => {
                          const isSelected = config.hairline === option.id;

                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => update({ hairline: option.id })}
                              className={cn(
                                'min-h-[42px] rounded-2xl border px-3 text-center text-[11px] font-black uppercase tracking-wide transition-all',
                                isSelected
                                  ? 'border-cyan-200/80 bg-cyan-300/25 text-white shadow-lg shadow-cyan-950/25'
                                  : 'border-white/10 bg-white/[0.06] text-slate-200 hover:border-white/25 hover:bg-white/[0.1]',
                              )}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {AVATAR_OPTIONS[active].map((option) => {
                      const isSelected = config[active] === option.id;

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => update({ [active]: option.id } as Partial<AvatarConfig>)}
                          className={cn(
                            'group min-h-[58px] rounded-2xl border p-3 text-left transition-all',
                            isSelected
                              ? 'border-cyan-300/70 bg-cyan-300/15 text-white shadow-lg shadow-cyan-950/30'
                              : 'border-white/10 bg-white/[0.065] text-slate-200 hover:border-white/25 hover:bg-white/[0.1]',
                          )}
                        >
                          <span className="flex items-center gap-2">
                            {'color' in option && option.color && (
                              <span
                                className="inline-block h-5 w-5 shrink-0 rounded-full border border-white/40 shadow-inner"
                                style={{ backgroundColor: option.color }}
                              />
                            )}
                            <span className="min-w-0">
                              <span className="block truncate text-[11px] font-black uppercase tracking-wide">{option.label}</span>
                              <span className={cn('mt-1 block h-1.5 w-10 rounded-full transition-all', isSelected ? 'bg-cyan-200' : 'bg-white/10 group-hover:bg-white/25')} />
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex h-11 min-w-[172px] items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 text-white shadow-inner">
      <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-cyan-100">
        <Palette className="h-3.5 w-3.5" /> {label}
      </span>
      <input
        type="color"
        value={value}
        onChange={(event: { target: { value: string } }) => onChange(event.target.value)}
        className="h-8 w-10 cursor-pointer rounded-xl border-0 bg-transparent p-0"
        aria-label={label}
      />
    </label>
  );
}
