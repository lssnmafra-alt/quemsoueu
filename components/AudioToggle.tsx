'use client';

import { useEffect, useState } from 'react';
import { audioManager, type CurrentMusicInfo } from '@/lib/audioManager';
import { Music, Volume2, VolumeX, SlidersHorizontal, Disc3, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

const NOW_PLAYING_EVENT = 'quemSouEu:music-track';

export default function AudioToggle() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState({ ...audioManager.prefs });
  const [currentTrack, setCurrentTrack] = useState<CurrentMusicInfo | null>(() => audioManager.getCurrentMusicInfo());
  const [toastTrack, setToastTrack] = useState<CurrentMusicInfo | null>(null);

  useEffect(() => {
    let toastTimer: ReturnType<typeof setTimeout> | null = null;

    const showTrack = (detail: CurrentMusicInfo | null) => {
      if (!detail?.url) return;
      setCurrentTrack(detail);
      setToastTrack(detail);
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => setToastTrack(null), 7200);
    };

    const onTrack = (event: Event) => {
      showTrack((event as CustomEvent<CurrentMusicInfo>).detail);
    };

    window.addEventListener(NOW_PLAYING_EVENT, onTrack as EventListener);
    const current = audioManager.getCurrentMusicInfo();
    if (current?.url) showTrack(current);

    return () => {
      if (toastTimer) clearTimeout(toastTimer);
      window.removeEventListener(NOW_PLAYING_EVENT, onTrack as EventListener);
    };
  }, []);

  const syncPrefs = () => {
    setPrefs({ ...audioManager.prefs });
    setCurrentTrack(audioManager.getCurrentMusicInfo());
  };

  const update = (next: Partial<typeof prefs>) => {
    audioManager.initFromUserGesture();

    if (next.muted === false) audioManager.unmuteAll();
    if (next.muted === true) audioManager.muteAll();
    if (next.musicVolume !== undefined) audioManager.setMusicVolume(next.musicVolume);
    if (next.sfxVolume !== undefined) audioManager.setSfxVolume(next.sfxVolume);
    if (next.musicEnabled !== undefined) audioManager.setMusicEnabled(next.musicEnabled);
    if (next.sfxEnabled !== undefined) audioManager.setSfxEnabled(next.sfxEnabled);

    syncPrefs();
  };

  return (
    <>
      <AnimatePresence>
        {toastTrack && !prefs.muted && (
          <motion.div
            drag
            dragMomentum={false}
            initial={{ opacity: 0, x: -18, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: -18, y: 16, scale: 0.96 }}
            className="fixed bottom-20 left-4 z-[120] w-[calc(100vw-2rem)] max-w-sm cursor-grab rounded-3xl border-4 border-indigo-100 bg-white/95 p-3 shadow-2xl backdrop-blur active:cursor-grabbing"
          >
            <button
              type="button"
              onClick={() => setToastTrack(null)}
              className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-indigo-100 bg-white text-slate-400 shadow-sm hover:text-rose-500"
              aria-label="Ocultar musica"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-500 to-amber-300 text-white shadow-inner">
                <Disc3 className="h-7 w-7 animate-spin" />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
                  <Music className="h-3.5 w-3.5" /> Tocando agora
                </p>
                <p className="mt-0.5 truncate text-base font-black text-indigo-950">{toastTrack.title || 'Musica'}</p>
                <p className="truncate text-xs font-bold text-slate-500">Categoria: {toastTrack.genre || 'Selecionada'}</p>
                <p className="mt-1 text-[9px] font-black uppercase tracking-wide text-slate-350">Arraste para o lado se atrapalhar</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-4 left-4 z-[90]">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              className="mb-3 w-[calc(100vw-2rem)] max-w-64 rounded-2xl border-2 border-indigo-100 bg-white p-4 shadow-xl"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-wider text-indigo-950">Audio do jogo</p>
                <button
                  type="button"
                  onClick={() => update({ muted: !prefs.muted })}
                  className={cn('rounded-xl border px-2 py-1 text-[10px] font-black uppercase', prefs.muted ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}
                >
                  {prefs.muted ? 'Mutado' : 'Ativo'}
                </button>
              </div>

              {currentTrack?.url && (
                <div className="mb-4 rounded-2xl border-2 border-indigo-50 bg-indigo-50/50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500">Musica atual</p>
                  <p className="mt-1 truncate text-xs font-black text-indigo-950">{currentTrack.title || 'Musica'}</p>
                  <p className="mt-0.5 truncate text-[11px] font-bold text-slate-500">Categoria: {currentTrack.genre || 'Selecionada'}</p>
                </div>
              )}

              <label className="mb-3 flex items-center justify-between gap-3 text-xs font-bold text-slate-600">
                <span className="flex items-center gap-2"><Music className="h-4 w-4 text-indigo-500" /> Musica</span>
                <input type="checkbox" checked={prefs.musicEnabled && !prefs.muted} onChange={(e) => update({ muted: false, musicEnabled: e.target.checked })} className="h-4 w-4 accent-indigo-600" />
              </label>
              <input type="range" min="0" max="1" step="0.05" value={prefs.musicVolume} onChange={(e) => update({ musicVolume: Number(e.target.value), muted: false })} className="mb-4 w-full accent-indigo-600" />

              <label className="mb-3 flex items-center justify-between gap-3 text-xs font-bold text-slate-600">
                <span className="flex items-center gap-2"><Volume2 className="h-4 w-4 text-indigo-500" /> Efeitos</span>
                <input type="checkbox" checked={prefs.sfxEnabled && !prefs.muted} onChange={(e) => update({ muted: false, sfxEnabled: e.target.checked })} className="h-4 w-4 accent-indigo-600" />
              </label>
              <input type="range" min="0" max="1" step="0.05" value={prefs.sfxVolume} onChange={(e) => update({ sfxVolume: Number(e.target.value), muted: false })} className="w-full accent-indigo-600" />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            audioManager.initFromUserGesture();
            setOpen((current) => !current);
            audioManager.playSfx('click');
            syncPrefs();
          }}
          className="rounded-2xl border-2 border-indigo-100 bg-white p-3 text-indigo-600 shadow-lg transition-colors hover:bg-indigo-50"
          aria-label="Configuracoes de audio"
        >
          {prefs.muted ? <VolumeX className="h-5 w-5" /> : <SlidersHorizontal className="h-5 w-5" />}
        </motion.button>
      </div>
    </>
  );
}
