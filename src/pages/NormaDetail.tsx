import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router';
import {
  ArrowLeft, Scale, FileText, Share2, Download,
  MessageSquare, BookOpen, Network, Sparkles,
  ChevronRight, ExternalLink, AlertTriangle,
  Copy, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import Markdown from 'react-markdown';
import { BalanzaLoader } from '../components/BalanzaLoader';

export function NormaDetail() {
  const { id } = useParams();
  const [norma, setNorma] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'texto' | 'relaciones' | 'ia'>('texto');
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/normas/${id}`)
      .then(res => res.json())
      .then(data => {
        setNorma(data);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || aiLoading || !norma || !id) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setAiLoading(true);
    setActiveTab('ia');
    setMessages(prev => [...prev, { role: 'model', text: '' }]);

    try {
      const res = await fetch(`/api/normas/${id}/ai-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: 'model', text: data.error || 'Hubo un error al procesar tu consulta. Por favor, reintenta.' };
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
        next[next.length - 1] = { role: 'model', text: 'Hubo un error al procesar tu consulta. Por favor, reintenta.' };
        return next;
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopy = () => {
    if (!norma) return;
    navigator.clipboard.writeText(`${norma.tipo} ${norma.numero}/${norma.anio}: ${norma.titulo}\n\n${norma.texto}\n\nFuente: LexARG - ${norma.fuente_url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <BalanzaLoader size="lg" text="Cargando Norma..." />
    </div>
  );
  if (!norma) return <div className="text-center py-20">Norma no encontrada</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Navigation */}
      <div className="flex items-center justify-between">
        <Link to="/normativa" className="flex items-center gap-2 text-stone-600 hover:text-indigo-600 font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Volver al buscador
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={handleCopy} className="p-2 text-stone-500 hover:text-indigo-600 transition-colors" title="Copiar cita">
            {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
          </button>
          <button className="p-2 text-stone-500 hover:text-indigo-600 transition-colors" title="Compartir">
            <Share2 className="w-5 h-5" />
          </button>
          <button className="p-2 text-stone-500 hover:text-indigo-600 transition-colors" title="Descargar PDF">
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
            {/* Norma Header */}
            <div className="p-8 border-b border-stone-100 bg-stone-50/50">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider border border-indigo-200">
                  {norma.tipo} {norma.numero}/{norma.anio}
                </span>
                <span className={clsx(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
                  norma.estado === 'Vigente' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                )}>
                  {norma.estado}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-stone-900 leading-tight mb-4">
                {norma.titulo}
              </h1>
              <div className="flex flex-wrap items-center gap-6 text-sm text-stone-500">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4" />
                  {norma.organismo}
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Publicado: {norma.fecha_publicacion}
                </div>
                <a
                  href={norma.fuente_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-indigo-600 hover:underline font-medium"
                >
                  Ver en InfoLEG <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Reading Mode Tabs */}
            <div className="flex border-b border-stone-100">
              <button
                onClick={() => setActiveTab('texto')}
                className={clsx(
                  "flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-all border-b-2",
                  activeTab === 'texto' ? "border-indigo-600 text-indigo-600 bg-indigo-50/30" : "border-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-50"
                )}
              >
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4" />
                  Texto Completo
                </div>
              </button>
              <button
                onClick={() => setActiveTab('relaciones')}
                className={clsx(
                  "flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-all border-b-2",
                  activeTab === 'relaciones' ? "border-indigo-600 text-indigo-600 bg-indigo-50/30" : "border-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-50"
                )}
              >
                <div className="flex items-center justify-center gap-2">
                  <Network className="w-4 h-4" />
                  Relaciones
                </div>
              </button>
            </div>

            {/* Content Display */}
            <div className="p-8 min-h-[400px]">
              <AnimatePresence mode="wait">
                {activeTab === 'texto' && (
                  <motion.div
                    key="texto"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="prose prose-stone max-w-none"
                  >
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl mb-8 flex gap-3 items-start">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800 leading-relaxed">
                        <strong>Aviso Legal:</strong> El texto aquí presentado se ofrece con fines informativos. LexARG no garantiza la exactitud absoluta de las transcripciones. Siempre verifique con la fuente oficial (Boletín Oficial / InfoLEG).
                      </p>
                    </div>
                    <div className="whitespace-pre-wrap font-serif text-lg leading-relaxed text-stone-800">
                      {norma.texto}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'relaciones' && (
                  <motion.div
                    key="relaciones"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    <div className="text-center py-12">
                      <Network className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                      <h3 className="text-lg font-bold text-stone-900">Grafo de Relaciones</h3>
                      <p className="text-stone-500 text-sm max-w-sm mx-auto">
                        Esta funcionalidad permite ver qué leyes modifica esta norma y cuáles la reglamentan.
                      </p>
                      <div className="mt-8 grid grid-cols-1 gap-3">
                        <div className="p-4 rounded-xl border border-stone-100 bg-stone-50 flex items-center justify-between text-left">
                          <div>
                            <div className="text-[10px] font-bold text-indigo-600 uppercase">Modifica a</div>
                            <div className="font-bold text-stone-900">Ley 24.240</div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-stone-400" />
                        </div>
                        <div className="p-4 rounded-xl border border-stone-100 bg-stone-50 flex items-center justify-between text-left">
                          <div>
                            <div className="text-[10px] font-bold text-amber-600 uppercase">Reglamentada por</div>
                            <div className="font-bold text-stone-900">Decreto 274/2019</div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-stone-400" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* AI Sidebar */}
        <div className="lg:sticky lg:top-24 space-y-6 h-fit">
          <div className="bg-stone-900 rounded-3xl p-6 text-white shadow-xl h-[500px] md:h-[600px] flex flex-col">
            <div className="flex items-center gap-3 mb-6 shrink-0">
              <div className="bg-indigo-500 p-2 rounded-xl">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold">Asistente LexARG</h3>
                <p className="text-[10px] text-stone-400 uppercase tracking-wider">IA Grounded en Normativa</p>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto pr-2 mb-4 space-y-4 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="text-center py-8 space-y-4">
                  <p className="text-sm text-stone-400 leading-relaxed">
                    ¿Necesitás ayuda para entender esta norma? Preguntame lo que quieras sobre el texto.
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      "¿De qué trata esta ley?",
                      "Explicame el Artículo 1",
                      "¿Qué sanciones prevé?",
                      "¿A quiénes aplica?"
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setInput(suggestion);
                          // We can't call handleSendMessage directly because of state update timing
                          // but we can set input and let the user click or use a useEffect
                        }}
                        className="text-left p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-stone-300 hover:bg-white/10 transition-all"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={clsx(
                      "flex flex-col space-y-1",
                      msg.role === 'user' ? "items-end" : "items-start"
                    )}
                  >
                    <div
                      className={clsx(
                        "max-w-[90%] p-3 rounded-2xl text-sm",
                        msg.role === 'user'
                          ? "bg-indigo-600 text-white rounded-tr-none"
                          : "bg-white/10 text-stone-200 rounded-tl-none"
                      )}
                    >
                      <div className="markdown-body prose prose-invert prose-sm max-w-none">
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
            <form onSubmit={handleSendMessage} className="relative shrink-0">
              <input
                type="text"
                placeholder="Preguntá sobre la norma..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={aiLoading}
                className="w-full bg-white/10 border border-white/20 rounded-2xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={aiLoading || !input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:bg-stone-700"
              >
                <Sparkles className="w-4 h-4 text-white" />
              </button>
            </form>
            <p className="text-[9px] text-stone-500 italic mt-3 text-center">
              * Respuestas generadas por IA. No constituye asesoramiento legal.
            </p>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm">
            <h4 className="font-bold text-stone-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              Anotaciones
            </h4>
            <textarea
              placeholder="Escribí una nota privada sobre esta norma..."
              className="w-full p-3 bg-stone-50 border border-stone-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px] mb-4"
            />
            <button className="w-full py-2 bg-stone-900 text-white rounded-xl font-bold text-sm hover:bg-stone-800 transition-colors">
              Guardar Nota
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
