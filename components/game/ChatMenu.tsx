import { useState, useEffect, useCallback, useId, useRef } from 'react';
import { supabaseGame } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { MessageCircle, Smile, X } from 'lucide-react';
import { motion } from 'motion/react';

type ChatMenuProps = {
  roomId?: string;
  room?: any;
  me: any;
  players?: any[];
  collapsible?: boolean;
};

export default function ChatMenu({ roomId, room, me, players = [], collapsible = true }: ChatMenuProps) {
  const resolvedRoomId = roomId || room?.id || '';
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const isOpenRef = useRef(isOpen);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const clearKey = me?.user_id && resolvedRoomId ? `chatClearedAt:${resolvedRoomId}:${me.user_id}` : '';
  const clearedAt = typeof window !== 'undefined' && clearKey ? localStorage.getItem(clearKey) : null;

  const visibleMessages = messages.filter((message) => {
    if (!clearedAt) return true;
    return new Date(message.created_at).getTime() > new Date(clearedAt).getTime();
  });

  const fetchMessages = useCallback(async () => {
    if (!resolvedRoomId) return;
    const { data } = await supabaseGame
      .from('messages')
      .select('*')
      .eq('room_id', resolvedRoomId)
      .order('created_at', { ascending: true })
      .limit(50);

    if (data) setMessages(data);
  }, [resolvedRoomId]);

  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [visibleMessages.length, isOpen]);

  useEffect(() => {
    if (!resolvedRoomId) return;
    const initialFetch = setTimeout(fetchMessages, 0);
    const refresh = setInterval(fetchMessages, 2000);
    const sub = supabaseGame.channel(`chat:${resolvedRoomId}:${instanceId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${resolvedRoomId}` }, (payload) => {
        setMessages((prev) => prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]);
        if (!isOpenRef.current) setUnread((s) => s + 1);
      })
      .subscribe();

    return () => {
      clearTimeout(initialFetch);
      clearInterval(refresh);
      sub.unsubscribe();
    };
  }, [resolvedRoomId, fetchMessages, instanceId]);

  const send = async (e?: any) => {
    if (e) e.preventDefault();
    if (!input.trim() || !me || !resolvedRoomId) return;
    const txt = input.trim();
    setInput('');

    const { data } = await supabaseGame.from('messages').insert({
      room_id: resolvedRoomId,
      sender_id: me.user_id,
      sender_name: me.nickname,
      content: txt,
    }).select().single();

    if (data) {
      setMessages((prev) => prev.some((m) => m.id === data.id) ? prev : [...prev, data]);
      import('@/app/actions/bots').then(({ triggerBotResponse }) => {
        triggerBotResponse(resolvedRoomId, txt, me.nickname);
      });
    }
  };

  const toggle = () => {
    setIsOpen((current) => !current);
    if (!isOpen) setUnread(0);
  };

  if (!isOpen) {
    return (
      <motion.button
        drag
        dragElastic={0.08}
        dragMomentum={false}
        whileDrag={{ scale: 1.05 }}
        onClick={toggle}
        className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-[75] flex h-14 w-14 items-center justify-center rounded-full border-2 border-indigo-200 bg-indigo-600 p-3 text-white shadow-2xl transition-colors hover:bg-indigo-700 active:cursor-grabbing"
        aria-label="Abrir chat"
      >
        <MessageCircle className="h-7 w-7 pointer-events-none" />
        {unread > 0 && <span className="absolute -top-1.5 -right-1.5 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black text-white shadow-md pointer-events-none">{unread}</span>}
      </motion.button>
    );
  }

  return (
    <motion.div
      drag={collapsible}
      dragElastic={0.06}
      dragMomentum={false}
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-[80] flex h-[min(420px,calc(100dvh-8rem))] w-[min(360px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border-2 border-indigo-100 bg-white shadow-2xl pointer-events-auto"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-indigo-100 bg-indigo-50/70 px-4 py-3">
        <span className="flex items-center gap-2 text-xs font-black text-indigo-950"><Smile className="h-5 w-5 text-indigo-500" /> CHAT</span>
        <button onClick={toggle} className="rounded-xl bg-white p-2 text-indigo-500 shadow-sm hover:bg-indigo-100" aria-label="Fechar chat"><X className="h-4 w-4" /></button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain bg-white p-3">
        {visibleMessages.length === 0 && <div className="m-auto rounded-2xl border-2 border-dashed border-indigo-100 bg-indigo-50/40 px-4 py-6 text-center text-xs font-black uppercase text-indigo-300">Nenhuma mensagem ainda</div>}
        {visibleMessages.map((m) => {
          const senderColor = players.find((p) => p.user_id === m.sender_id)?.color;
          return (
            <div key={m.id} className="w-full rounded-2xl border border-indigo-100 bg-indigo-50/35 px-3 py-2 text-[13px] leading-snug shadow-sm">
              <span className={cn('mr-1.5 font-black tracking-wide', senderColor?.text || 'text-indigo-600')}>{m.sender_name}:</span>
              <span className="font-semibold text-indigo-950 break-words [overflow-wrap:anywhere]">{m.content}</span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 border-t border-indigo-100 bg-white p-3">
        <form onSubmit={send} className="relative flex items-center">
          <input value={input} maxLength={200} onChange={(e) => setInput(e.target.value)} className="w-full min-w-0 rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm font-semibold text-indigo-950 shadow-inner transition-all placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none" placeholder="Escreva algo..." />
          <button type="submit" className="absolute right-2 rounded-xl p-2.5 text-indigo-500 transition-colors hover:text-indigo-400" aria-label="Enviar mensagem"><svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg></button>
        </form>
      </div>
    </motion.div>
  );
}
