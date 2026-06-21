import { useState, useEffect, useCallback, useId, useRef } from 'react';
import { supabaseGame } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Smile } from 'lucide-react';
import { motion } from 'motion/react';

type ChatMenuProps = {
  roomId?: string;
  room?: any;
  me: any;
  players?: any[];
  collapsible?: boolean;
};

export default function ChatMenu({ roomId, room, me, players = [], collapsible = false }: ChatMenuProps) {
  const resolvedRoomId = roomId || room?.id || '';
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(!collapsible);
  const [unread, setUnread] = useState(0);
  const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const isOpenRef = useRef(isOpen);
  const clearKey = me?.user_id && resolvedRoomId ? `chatClearedAt:${resolvedRoomId}:${me.user_id}` : '';
  const clearedAt = typeof window !== 'undefined' && clearKey ? localStorage.getItem(clearKey) : null;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const visibleMessages = messages.filter((message) => {
    if (!clearedAt) return true;
    return new Date(message.created_at).getTime() > new Date(clearedAt).getTime();
  });

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [visibleMessages, isOpen]);

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

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (!resolvedRoomId) return;
    const initialFetch = setTimeout(fetchMessages, 0);
    const refresh = setInterval(fetchMessages, 2000);

    const sub = supabaseGame.channel(`chat:${resolvedRoomId}:${instanceId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${resolvedRoomId}` }, (payload) => {
        setMessages((prev) => prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]);
        if (!isOpenRef.current) setUnread((s) => s + 1);
      }).subscribe();

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
    setIsOpen(!isOpen);
    if (!isOpen) setUnread(0);
  };

  if (collapsible && !isOpen) {
    return (
      <motion.button
        drag
        dragConstraints={typeof window !== 'undefined' ? { left: -window.innerWidth + 70, right: 0, top: -window.innerHeight + 90, bottom: 0 } : undefined}
        dragElastic={0.08}
        dragMomentum={false}
        whileDrag={{ scale: 1.05 }}
        onClick={toggle}
        className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 sm:top-24 sm:bottom-auto bg-indigo-600 border-2 border-indigo-200 p-3 rounded-full h-14 w-14 flex items-center justify-center shadow-2xl z-[75] text-white hover:bg-indigo-700 transition-colors active:cursor-grabbing"
        aria-label="Abrir chat"
      >
        <svg className="w-7 h-7 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
        {unread > 0 && <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md pointer-events-none">{unread}</span>}
      </motion.button>
    );
  }

  return (
    <div className={cn('flex flex-col overflow-hidden transition-all pointer-events-auto', collapsible ? 'fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] top-[max(0.75rem,env(safe-area-inset-top))] z-[80] sm:absolute sm:inset-x-auto sm:bottom-4 sm:right-4 sm:top-20 sm:w-[390px] sm:h-[min(720px,calc(100dvh-7rem))]' : 'w-full h-full bg-slate-50/50')}>
      <div className={cn('flex flex-col flex-1 min-h-0 w-full overflow-hidden pointer-events-auto', collapsible ? 'bg-indigo-950/94 sm:bg-indigo-950/86 backdrop-blur-md rounded-3xl border border-indigo-700/70 shadow-2xl h-full relative' : 'h-full bg-white relative')}>
        <div className={cn('px-4 py-3 border-b shrink-0 flex items-center justify-between', collapsible ? 'border-indigo-800/70 bg-indigo-950/70' : 'border-indigo-50 bg-indigo-50/10')}>
          <span className={cn('text-xs font-black flex items-center gap-2', collapsible ? 'text-indigo-100' : 'text-indigo-950')}><Smile className={cn('w-5 h-5', collapsible ? 'text-indigo-300' : 'text-indigo-500')} /> CHAT</span>
          {collapsible && <button onClick={toggle} className="text-indigo-200 hover:text-white bg-indigo-900/70 hover:bg-indigo-800 p-2 rounded-xl transition-all cursor-pointer" aria-label="Fechar chat"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>}
        </div>

        <div className={cn('flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-2 flex flex-col', collapsible ? '' : 'space-y-3.5 p-4')}>
          {visibleMessages.map((m) => {
            const senderColor = players.find((p) => p.user_id === m.sender_id)?.color;
            return (
              <div key={m.id} className="flex flex-col w-full items-start">
                {collapsible ? (
                  <div className="text-[14px] leading-snug w-full rounded-2xl border border-indigo-800/50 bg-indigo-900/35 px-3 py-2 shadow-sm"><span className={cn('font-black tracking-wide mr-1.5', senderColor?.text || 'text-indigo-300')}>{m.sender_name}:</span><span className="text-indigo-50 font-medium break-words [overflow-wrap:anywhere]">{m.content}</span></div>
                ) : (
                  <div className="p-3 text-sm max-w-[90%] font-semibold shadow-sm inline-block leading-relaxed border bg-white text-indigo-950 border-indigo-100 rounded-3xl rounded-tl-none border-2"><span className={cn('font-black tracking-wide mr-2', senderColor?.text || 'text-indigo-600')}>{m.sender_name}:</span><span className="text-slate-700 break-words [overflow-wrap:anywhere]">{m.content}</span></div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className={cn('p-3 shrink-0 border-t', collapsible ? 'border-indigo-800/70 bg-indigo-950/80 pb-[max(0.75rem,env(safe-area-inset-bottom))]' : 'border-indigo-50 bg-white p-4')}>
          <form onSubmit={send} className="relative flex items-center">
            <input value={input} maxLength={200} onChange={(e) => setInput(e.target.value)} className={cn('w-full min-w-0 rounded-2xl px-4 py-3.5 pr-12 text-base font-semibold transition-all shadow-inner focus:outline-none', collapsible ? 'bg-indigo-900/60 border border-indigo-700 text-indigo-50 placeholder:text-indigo-300 focus:border-indigo-300 focus:bg-indigo-900' : 'bg-slate-50 border-2 border-slate-200 hover:border-indigo-100 text-indigo-950 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white')} placeholder="Escreva algo..." />
            <button type="submit" className={cn('absolute right-2 text-indigo-500 hover:text-indigo-400 p-2.5 transition-colors cursor-pointer rounded-xl', collapsible ? 'text-indigo-300 hover:text-white' : '')} aria-label="Enviar mensagem"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/></svg></button>
          </form>
        </div>
      </div>
    </div>
  );
}
