import React, { useRef, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { clsx } from 'clsx';
import Markdown from 'react-markdown';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface BriefAiChatProps {
  resourceId: string | number;
  resourceType: 'brief' | 'norma';
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  input: string;
  setInput: (val: string) => void;
  aiLoading: boolean;
  setAiLoading: (val: boolean) => void;
  isFloating?: boolean;
  onClose?: () => void;
  className?: string;
}

export function BriefAiChat({
  resourceId,
  resourceType,
  messages,
  setMessages,
  input,
  setInput,
  aiLoading,
  setAiLoading,
  isFloating = false,
  onClose,
  className
}: BriefAiChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || aiLoading || !resourceId) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setAiLoading(true);
    setMessages(prev => [...prev, { role: 'model', text: '' }]);

    try {
      const endpoint = resourceType === 'norma' 
        ? `/api/normas/${resourceId}/ai-chat`
        : `/api/briefs/${resourceId}/ai-chat`;
        
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: 'model', text: data.error || 'Error de conexión con la IA. Por favor, reintenta.' };
          return next;
        });
        return;
      }
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: 'model', text: data.text ?? '' };
        return next;
      });
    } catch (error) {
      console.error('Error in chat:', error);
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: 'model', text: 'Error de conexión con la IA. Por favor, reintenta.' };
        return next;
      });
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className={clsx(
      "bg-indigo-900 bg-gradient-to-br from-indigo-900 to-indigo-800 rounded-3xl text-white shadow-2xl border border-indigo-700/50 flex flex-col overflow-hidden",
      isFloating ? "p-5 w-[380px] h-[600px] max-h-[85vh] fixed top-24 right-6 z-[1000] lg:static lg:w-full lg:h-[calc(100vh-140px)] lg:max-h-none lg:z-auto lg:top-0 lg:right-0" : "p-6 h-[500px] md:h-[600px]",
      className
    )}>
      {/* Header */}
      <div className={clsx(
        "flex items-center shrink-0 border-b border-indigo-700/50 pb-3 mb-4",
        isFloating ? "justify-between" : "gap-3"
      )}>
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 backdrop-blur-md rounded-xl border border-white/10">
            <Sparkles className={isFloating ? "w-4 h-4 text-indigo-200" : "w-5 h-5 text-indigo-200"} />
          </div>
          <div>
            <h3 className={clsx("font-bold tracking-tight", isFloating ? "text-base" : "text-lg")}>Asistente LexARG</h3>
            <p className={clsx("text-indigo-300 uppercase tracking-widest font-semibold flex items-center gap-1", isFloating ? "text-[9px]" : "text-[10px]")}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              IA Especializada
            </p>
          </div>
        </div>
        {isFloating && onClose && (
          <button onClick={onClose} className="text-indigo-250 hover:text-white transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Chat Messages */}
      <div className={clsx(
        "flex-1 overflow-y-auto pr-1 mb-3 space-y-3 custom-scrollbar text-left",
        isFloating ? "text-xs" : "text-sm"
      )}>
        {messages.length === 0 ? (
          <div className={clsx("text-center py-6 space-y-3", isFloating ? "" : "py-8 space-y-4")}>
            <p className={clsx("text-indigo-200 leading-relaxed", isFloating ? "text-xs" : "text-sm")}>
              ¿Tenés dudas sobre este fallo? Preguntame lo que quieras.
            </p>
            <div className="grid grid-cols-1 gap-2">
              {[
                "¿Cuál fue la decisión principal?",
                "Explicame los hechos",
                "¿Por qué es importante este fallo?",
                "Resumí los argumentos"
              ].map((suggestion) => (
                <button
                  type="button"
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="text-left p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-indigo-200 hover:bg-white/10 transition-all font-sans cursor-pointer animate-none"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={clsx("flex flex-col space-y-1", msg.role === 'user' ? "items-end" : "items-start")}>
              <div className={clsx(
                "max-w-[90%] p-3 rounded-2xl font-sans",
                msg.role === 'user' ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white/10 text-stone-200 rounded-tl-none",
                isFloating ? "text-xs" : "text-sm"
              )}>
                <div className={clsx("markdown-body prose prose-invert max-w-none", isFloating ? "prose-xs" : "prose-sm")}>
                  <Markdown>{msg.text}</Markdown>
                </div>
              </div>
            </div>
          ))
        )}
        {aiLoading && (
          <div className="flex gap-1 p-2">
            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSendMessage} className="relative shrink-0 font-sans mt-auto">
        <input
          type="text"
          placeholder="Preguntá sobre el fallo..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={aiLoading}
          className={clsx(
            "w-full bg-white/10 border border-white/20 rounded-2xl pl-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50 text-white placeholder-indigo-300",
            isFloating ? "py-2.5 pr-10 text-xs" : "py-3 pr-12 text-sm"
          )}
        />
        <button
          type="submit"
          disabled={aiLoading || !input.trim()}
          className={clsx(
            "absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:bg-indigo-800 cursor-pointer",
            isFloating ? "right-1.5 p-2" : ""
          )}
        >
          <Sparkles className={isFloating ? "w-3.5 h-3.5 text-white" : "w-4 h-4 text-white"} />
        </button>
      </form>

      {!isFloating && (
        <p className="text-[9px] text-stone-500 italic mt-3 text-center shrink-0">
          * Respuestas generadas por IA. No constituye asesoramiento legal.
        </p>
      )}
    </div>
  );
}
