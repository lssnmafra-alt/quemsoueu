'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Shield, X } from 'lucide-react';
import { AVATAR_COLORS, AVATAR_FRAMES } from '@/lib/avatar-colors';
import { AVATARS, AvatarSelection, AVATAR_STATES, normalizeAvatarSelection, storeAvatar } from '@/lib/avatars';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import AvatarFigure from './AvatarFigure';

type AvatarPickerModalProps = {
  open: boolean;
  initial?: Partial<AvatarSelection> | null;
  onClose: () => void;
  onSave: (selection: AvatarSelection) => void;
};

export default function AvatarPickerModal({ open, initial, onClose, onSave }: AvatarPickerModalProps) {
  const [selection, setSelection] = useState<AvatarSelection>(() => normalizeAvatarSelection(initial));
  const currentAvatar = useMemo(() => AVATARS.find((avatar) => avatar.id === selection.avatarId) || AVATARS[0], [selection.avatarId]);

  const save = () => {
    const normalized = normalizeAvatarSelection(selection);
    storeAvatar(normalized);
    onSave(normalized);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            className="w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-white border-4 border-slate-200 rounded-2xl shadow-2xl"
          >
            <div className="sticky top-0 z-10 bg-white border-b-2 border-slate-100 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-950">Escolher Avatar</h2>
                  <p className="text-xs font-bold text-slate-500">Modelos autorais com cores e molduras.</p>
                </div>
              </div>
              <button onClick={onClose} className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid lg:grid-cols-[340px_1fr] gap-6 p-5">
              <div className="bg-slate-900 rounded-2xl p-5 text-white">
                <AvatarFigure selection={selection} state="idle" className="w-full aspect-square border-4 border-slate-700 rounded-2xl mb-4" />
                <h3 className="text-2xl font-black">{currentAvatar.name}</h3>
                <p className="text-sm text-slate-300 font-semibold mt-1">{currentAvatar.description}</p>
                <div className="grid grid-cols-4 gap-2 mt-5">
                  {AVATAR_STATES.map((state) => (
                    <div key={state} className="bg-slate-800 rounded-xl p-2 border border-slate-700">
                      <AvatarFigure selection={selection} state={state} className="w-full aspect-square border-0 rounded-lg" />
                      <p className="text-[9px] text-center uppercase font-black text-slate-300 mt-1">{state}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                <section>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">Avatar base</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                    {AVATARS.map((avatar) => {
                      const active = selection.avatarId === avatar.id;
                      return (
                        <button
                          key={avatar.id}
                          onClick={() => setSelection(normalizeAvatarSelection({ ...selection, avatarId: avatar.id }))}
                          className={cn(
                            'text-left p-3 rounded-xl border-2 bg-white hover:border-blue-400 transition-all',
                            active ? 'border-blue-600 ring-4 ring-blue-100' : 'border-slate-200'
                          )}
                        >
                          <AvatarFigure selection={{ ...selection, avatarId: avatar.id }} className="w-full aspect-square rounded-lg mb-2" />
                          <span className="text-sm font-black text-slate-950 block truncate">{avatar.name}</span>
                          <span className="text-[10px] font-bold uppercase text-slate-400">{avatar.rarity}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="grid md:grid-cols-2 gap-5">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">Cor principal</h3>
                    <div className="flex flex-wrap gap-2">
                      {AVATAR_COLORS.map((color) => (
                        <button
                          key={color.id}
                          title={color.name}
                          onClick={() => setSelection({ ...selection, primaryColor: color.value })}
                          className={cn('w-9 h-9 rounded-xl border-2 flex items-center justify-center', selection.primaryColor === color.value ? 'border-slate-950' : 'border-slate-200')}
                          style={{ backgroundColor: color.value }}
                        >
                          {selection.primaryColor === color.value && <Check className="w-4 h-4 text-white drop-shadow" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">Cor secundaria</h3>
                    <div className="flex flex-wrap gap-2">
                      {AVATAR_COLORS.map((color) => (
                        <button
                          key={color.id}
                          title={color.name}
                          onClick={() => setSelection({ ...selection, secondaryColor: color.value })}
                          className={cn('w-9 h-9 rounded-xl border-2 flex items-center justify-center', selection.secondaryColor === color.value ? 'border-slate-950' : 'border-slate-200')}
                          style={{ backgroundColor: color.value }}
                        >
                          {selection.secondaryColor === color.value && <Check className="w-4 h-4 text-white drop-shadow" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">Moldura visual</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {AVATAR_FRAMES.map((frame) => (
                      <button
                        key={frame.id}
                        onClick={() => setSelection({ ...selection, frameId: frame.id })}
                        className={cn('h-11 rounded-xl border-2 text-sm font-black flex items-center justify-center gap-2', selection.frameId === frame.id ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600')}
                      >
                        <span className="w-4 h-4 rounded-full border border-slate-300" style={{ backgroundColor: frame.color }} />
                        {frame.name}
                      </button>
                    ))}
                  </div>
                </section>

                <div className="flex gap-3 pt-2">
                  <Button onClick={save} className="flex-1 h-12 btn-squishy-green text-white font-black uppercase">Salvar Avatar</Button>
                  <Button onClick={onClose} variant="outline" className="h-12 px-6 rounded-xl border-2 border-slate-200 font-black uppercase">Cancelar</Button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
