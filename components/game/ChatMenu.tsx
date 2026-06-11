import { useState, useEffect, useCallback, useId, useRef } from 'react';
import { supabaseGame } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Smile } from 'lucide-react';
import { motion } from 'motion/react';

export default function ChatMenu({ roomId, me, players = [], collapsible = false }: { roomId: string, me: any, players?: any[], collapsible?: boolean }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(!collapsible);
  const [unread, setUnread] = useState(0);
  const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const isOpenRef = useRef(isOpen);
  const clearKey = me?.user_id ? `chatClearedAt:${roomId}:${me.user_id}` : '';
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
    const { data } = await supabaseGame
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(50);

    if (data) setMessages(data);
  }, [roomId]);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    const initialFetch = setTimeout(fetchMessages, 0);
    const refresh = setInterval(fetchMessages, 2000);

    const sub = supabaseGame.channel(`chat:${roomId}:${instanceId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, (payload) => {
         setMessages(prev => prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]);
         if (!isOpenRef.current) {
           setUnread(s => s + 1);
         }
      }).subscribe();
      
    return () => {
      clearTimeout(initialFetch);
      clearInterval(refresh);
      sub.unsubscribe();
    }
  }, [roomId, fetchMessages, instanceId]);

  const send = async (e?: any) => {
    if(e) e.preventDefault();
    if (!input.trim() || !me) return;
    const txt = input;
    setInput('');
    const { data } = await supabaseGame.from('messages').insert({
      room_id: roomId,
      sender_id: me.user_id,
      sender_name: me.nickname,
      content: txt
    }).select().single();

    if (data) {
      setMessages(prev => prev.some((m) => m.id === data.id) ? prev : [...prev, data]);
      import('@/app/actions/bots').then(({ triggerBotResponse }) => {
        triggerBotResponse(roomId, txt, me.nickname);
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
         dragConstraints={typeof window !== 'undefined' ? { left: -window.innerWidth + 60, right: 0, top: 0, bottom: window.innerHeight - 60 } : undefined}
         dragElastic={0.1}
         dragMomentum={false}
         whileDrag={{ scale: 1.05 }}
         onClick={toggle} 
         className="fixed bottom-24 right-4 sm:top-24 sm:bottom-auto bg-indigo-900/60 backdrop-blur-md border border-indigo-500/50 p-3 rounded-full flex items-center justify-center shadow-lg z-[60] text-indigo-100 hover:text-white transition-colors hover:bg-indigo-800/80 cursor-grab active:cursor-grabbing"
       >
         <svg className="w-6 h-6 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
         {unread > 0 && <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md pointer-events-none">{unread}</span>}
       </motion.button>
     )
  }

  return (
    <div className={cn(
      "flex flex-col h-full rounded-none overflow-hidden transition-all", 
      collapsible 
        ? "absolute inset-x-2 bottom-2 top-16 sm:bottom-4 sm:left-auto sm:right-4 z-[60] sm:w-[390px] pointer-events-auto" 
        : "w-full bg-slate-50/50 pointer-events-auto"
    )}>
      
      <div className={cn(
        "flex flex-col flex-1 w-full overflow-hidden pointer-events-auto",
        collapsible ? "bg-indigo-950/90 sm:bg-indigo-950/82 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-indigo-700/70 shadow-2xl h-full relative" : "h-full bg-white relative"
      )}>
        {/* Header */}
        <div className={cn("p-4 border-b shrink-0 flex items-center justify-between", collapsible ? "border-indigo-800/70 bg-indigo-950/60" : "border-indigo-50 bg-indigo-50/10")}>
          <span className={cn("text-xs font-black flex items-center gap-2", collapsible ? "text-indigo-200" : "text-indigo-950")}>
             <Smile className={cn("w-5 h-5", collapsible ? "text-indigo-400" : "text-indigo-500")} /> CHAT
          </span>
          {collapsible && (
            <button onClick={toggle} className="text-indigo-300 hover:text-white bg-indigo-900/50 hover:bg-indigo-800 p-2 rounded-xl transition-all cursor-pointer">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>

        {/* Messages */}
        <div className={cn("flex-1 overflow-y-auto p-4 space-y-2 flex flex-col", collapsible ? "" : "space-y-3.5")}>
           {visibleMessages.map(m => {
             const senderColor = players.find(p => p.user_id === m.sender_id)?.color;
             return (
               <div key={m.id} className="flex flex-col w-full items-start">
                  {collapsible ? (
                    <div className="flex text-[15px] leading-snug w-full">
                       <span className={cn("font-black tracking-wider mr-2 shrink-0", senderColor?.text || 'text-indigo-300')}>
                         {m.sender_name}:
                       </span>
                       <span className="text-indigo-50 font-medium break-words w-full">{m.content}</span>
                    </div>
                  ) : (
                    <div className="p-3 text-sm max-w-[90%] font-semibold shadow-sm inline-block leading-relaxed border bg-white text-indigo-950 border-indigo-100 rounded-3xl rounded-tl-none border-2">
                      <span className={cn("font-black tracking-wide mr-2", senderColor?.text || 'text-indigo-600')}>
                        {m.sender_name}:
                      </span>
                      <span className="text-slate-700">{m.content}</span>
                    </div>
                  )}
               </div>
             );
           })}
           <div ref={messagesEndRef} />
        </div>
        
        {/* Input */}
        <div className={cn("p-4 shrink-0 border-t", collapsible ? "border-indigo-800/70 bg-indigo-950/60" : "border-indigo-50 bg-white")}>
           <form onSubmit={send} className="relative flex items-center">
              <input 
                value={input} 
                maxLength={200}
                onChange={e => setInput(e.target.value)} 
                className={cn(
                  "w-full rounded-2xl px-5 py-3.5 pr-12 text-base sm:text-sm font-semibold transition-all shadow-inner focus:outline-none",
                  collapsible 
                    ? "bg-indigo-900/50 border border-indigo-800 hover:border-indigo-600 text-indigo-50 placeholder:text-indigo-300 focus:border-indigo-400 focus:bg-indigo-900" 
                    : "bg-slate-50 border-2 border-slate-200 hover:border-indigo-100 text-indigo-950 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white"
                )} 
                placeholder="Escreva algo..."
              />
              <button type="submit" className={cn("absolute right-2 text-indigo-500 hover:text-indigo-400 p-2.5 transition-colors cursor-pointer", collapsible ? "text-indigo-400 hover:text-indigo-300" : "")}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/></svg>
              </button>
           </form>
        </div>
      </div>
    </div>
  );
}
