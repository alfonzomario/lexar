import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { Scale, ArrowLeft, FileText, Bookmark, Share2, AlertCircle, Sparkles, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import Markdown from 'react-markdown';
import { BalanzaLoader } from '../components/BalanzaLoader';
import { useAuth } from '../contexts/AuthContext';
import { HighlightableText } from '../components/HighlightableText';

/** Formatea texto para lectura: normaliza espacios y preserva párrafos */
function formatParagraphs(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n /g, '\n')
    .replace(/ \n/g, '\n');
}

export function BriefDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [brief, setBrief] = useState<any>(null);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('tldr');
  const [savedForLater, setSavedForLater] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const isBasicOrAbove = user && ['basic', 'pro', 'admin', 'super_admin'].includes(user.tier);
  const isPro = user?.tier === 'pro' || user?.tier === 'admin' || user?.tier === 'super_admin';

  // AI Chat States
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchAnnotations = () => {
    if (user && id) {
      fetch(`/api/briefs/${id}/annotations?userId=${user.id}`)
        .then(res => res.json())
        .then(data => setAnnotations(data))
        .catch(console.error);
    }
  };

  useEffect(() => {
    fetch(`/api/briefs/${id}`)
      .then((res) => res.json())
      .then((data) => setBrief(data));

    fetchAnnotations();
  }, [id, user]);

  useEffect(() => {
    if (!user || !isBasicOrAbove || !id) return;
    fetch(`/api/saved-for-later/check?resource_type=brief&resource_id=${id}`, { headers: { 'X-User-Id': String(user.id) } })
      .then((r) => r.json())
      .then((d) => setSavedForLater(!!d.saved))
      .catch(() => setSavedForLater(false));
  }, [user?.id, isBasicOrAbove, id]);

  const toggleSavedForLater = () => {
    if (!user || !id) return;
    const headers = { 'X-User-Id': String(user.id), 'Content-Type': 'application/json' };
    if (savedForLater) {
      fetch(`/api/saved-for-later?resource_type=brief&resource_id=${id}`, { method: 'DELETE', headers: { 'X-User-Id': String(user.id) } }).then(() => setSavedForLater(false));
    } else {
      fetch('/api/saved-for-later', { method: 'POST', headers, body: JSON.stringify({ resource_type: 'brief', resource_id: Number(id) }) }).then(() => setSavedForLater(true));
    }
  };

  const fetchAiSummary = () => {
    if (!user || !id || !isPro) return;
    setAiSummaryLoading(true);
    setAiSummary(null);
    fetch(`/api/briefs/${id}/summarize`, { method: 'POST', headers: { 'X-User-Id': String(user.id), 'Content-Type': 'application/json' } })
      .then((r) => r.json())
      .then((data) => setAiSummary(data.summary || data.error || 'No se pudo generar.'))
      .catch(() => setAiSummary('Error de conexión.'))
      .finally(() => setAiSummaryLoading(false));
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || aiLoading || !brief || !id) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setAiLoading(true);
    setMessages(prev => [...prev, { role: 'model', text: '' }]);

    try {
      const res = await fetch(`/api/briefs/${id}/ai-chat`, {
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

  const handleAddAnnotation = async (text: string, note: string) => {
    if (!user) return;
    const res = await fetch(`/api/briefs/${id}/annotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        selected_text: text,
        note: note,
        color: 'bg-yellow-200 text-stone-900',
      })
    });
    if (res.ok) {
      fetchAnnotations();
      window.getSelection()?.removeAllRanges();
    }
  };

  const handleDeleteBrief = async () => {
    if (!window.confirm('¿Estás seguro de que querés eliminar este fallo y todas sus anotaciones?')) return;

    try {
      const res = await fetch(`/api/briefs/${brief.id}`, { method: 'DELETE' });
      if (res.ok) {
        navigate('/briefs');
      }
    } catch (error) {
      console.error('Error deleting brief', error);
    }
  };

  if (!brief) return (
    <div className="flex h-[60vh] items-center justify-center">
      <BalanzaLoader size="lg" text="Analizando Jurisprudencia..." />
    </div>
  );

  const tabs = [
    { id: 'tldr', name: 'Síntesis' },
    { id: 'full', name: 'Sentencia Completa' },
    { id: 'normativa', name: 'Normativa' },
    { id: 'relacionados', name: 'Relacionados' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center gap-4 mb-6">
        <Link
          to="/briefs"
          className="p-2 text-stone-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2 text-sm font-medium text-stone-500">
          <span>LexAR Briefs</span>
          <span>/</span>
          <span className="text-stone-900 truncate">Fallo</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-stone-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 flex gap-2">
              {isBasicOrAbove && (
                <button
                  onClick={toggleSavedForLater}
                  className={clsx('p-2 rounded-full transition-colors', savedForLater ? 'text-indigo-600 bg-indigo-50 fill-indigo-600' : 'text-stone-400 hover:text-indigo-600 hover:bg-indigo-50')}
                  title={savedForLater ? 'Quitar de Para leer después' : 'Guardar para leer después'}
                >
                  <Bookmark className={clsx('w-5 h-5', savedForLater && 'fill-current')} />
                </button>
              )}
              <button className="p-2 text-stone-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors">
                <Share2 className="w-5 h-5" />
              </button>
              {!brief.is_demo && (
                <button
                  onClick={handleDeleteBrief}
                  className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                  title="Eliminar fallo"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                  Case Brief
                </span>
                {brief.is_demo && (
                  <span className="text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Demo
                  </span>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-stone-900 mb-6 leading-tight">
                {brief.title}
              </h1>
              <div className="flex flex-wrap gap-2 mb-8">
                {brief.keywords.split(',').map((kw: string) => (
                  <span key={kw} className="text-xs font-medium text-stone-600 bg-stone-100 px-2 py-1 rounded-md">
                    {kw.trim()}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-4 border-b border-stone-200 overflow-x-auto pb-px sticky top-[72px] bg-[#FAF9F6] z-10 pt-4 px-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'px-6 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap',
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
                )}
              >
                {tab.name}
              </button>
            ))}
          </div>

          <div className="mt-8 max-w-full">
            {activeTab === 'tldr' && (
              <div className="space-y-8">
                <section className="bg-white p-8 rounded-2xl shadow-sm border border-stone-100">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-stone-900 border-b border-stone-50 pb-2">
                    <AlertCircle className="w-5 h-5 text-indigo-600" />
                    Cuestión Jurídica (Issue)
                  </h2>
                  <div className="text-lg text-stone-800 leading-relaxed font-serif italic border-l-4 border-indigo-100 pl-4 py-1 whitespace-pre-line">
                    <HighlightableText text={formatParagraphs(brief.issue)} annotations={annotations} onAddAnnotation={handleAddAnnotation} />
                  </div>
                </section>

                <section className="bg-white p-8 rounded-2xl shadow-sm border border-stone-100">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-stone-900 border-b border-stone-50 pb-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    Regla / Doctrina
                  </h2>
                  <div className="text-lg text-stone-800 leading-relaxed font-serif whitespace-pre-line">
                    <HighlightableText text={formatParagraphs(brief.rule)} annotations={annotations} onAddAnnotation={handleAddAnnotation} />
                  </div>
                </section>

                <section className="bg-white p-8 rounded-2xl shadow-sm border border-stone-100">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-stone-900 border-b border-stone-50 pb-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    Argumentos Principales
                  </h2>
                  <div className="text-lg text-stone-800 leading-relaxed font-serif whitespace-pre-line">
                    <HighlightableText text={formatParagraphs(brief.reasoning)} annotations={annotations} onAddAnnotation={handleAddAnnotation} />
                  </div>
                </section>

                <section className="bg-white p-8 rounded-2xl shadow-sm border border-stone-100">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-stone-900 border-b border-stone-50 pb-2">
                    <Scale className="w-5 h-5 text-indigo-600" />
                    Decisión (Holding)
                  </h2>
                  <div className="text-lg text-stone-800 leading-relaxed font-serif">
                    <HighlightableText text={formatParagraphs(brief.holding)} annotations={annotations} onAddAnnotation={handleAddAnnotation} />
                  </div>
                </section>

                <section className="bg-white p-8 rounded-2xl shadow-sm border border-stone-100">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-stone-900 border-b border-stone-50 pb-2">
                    <Bookmark className="w-5 h-5 text-indigo-600" />
                    Relevancia
                  </h2>
                  <div className="text-lg text-stone-800 leading-relaxed font-serif bg-stone-50 p-6 rounded-xl whitespace-pre-line">
                    <HighlightableText text={formatParagraphs(brief.relevance)} annotations={annotations} onAddAnnotation={handleAddAnnotation} />
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'full' && (
              <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-stone-100">
                <h2 className="text-2xl font-bold mb-6 text-stone-900 border-b border-stone-100 pb-2">Sentencia Completa</h2>
                <div className="text-lg text-stone-700 leading-relaxed font-serif whitespace-pre-line">
                  <HighlightableText
                    text={formatParagraphs(brief.facts)}
                    annotations={annotations}
                    onAddAnnotation={handleAddAnnotation}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AI Sidebar */}
        <div className="lg:sticky lg:top-24 space-y-6 h-fit">
          {isPro && (
            <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
              <h3 className="font-bold text-stone-900 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Resumen con IA
              </h3>
              {!aiSummary && !aiSummaryLoading && (
                <button type="button" onClick={fetchAiSummary} className="text-sm text-indigo-600 font-medium hover:underline">
                  Generar resumen del fallo
                </button>
              )}
              {aiSummaryLoading && <p className="text-sm text-stone-500">Generando...</p>}
              {aiSummary && !aiSummaryLoading && (
                <div className="text-sm text-stone-700 leading-relaxed whitespace-pre-line mt-2">
                  <Markdown>{aiSummary}</Markdown>
                </div>
              )}
            </div>
          )}
          <div className="bg-stone-900 rounded-3xl p-6 text-white shadow-xl h-[500px] md:h-[600px] flex flex-col">
            <div className="flex items-center gap-3 mb-6 shrink-0">
              <div className="bg-indigo-500 p-2 rounded-xl">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold">Asistente LexAR</h3>
                <p className="text-[10px] text-stone-400 uppercase tracking-wider">IA Especializada en Casos</p>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto pr-2 mb-4 space-y-4 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="text-center py-8 space-y-4">
                  <p className="text-sm text-stone-400 leading-relaxed">
                    ¿Tenes dudas sobre este fallo? Preguntame lo que quieras.
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      "¿Cuál fue la decisión principal?",
                      "Explicame los hechos",
                      "¿Por qué es importante este fallo?",
                      "Resumí los argumentos"
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setInput(suggestion)}
                        className="text-left p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-stone-300 hover:bg-white/10 transition-all font-sans"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={clsx("flex flex-col space-y-1", msg.role === 'user' ? "items-end" : "items-start")}>
                    <div className={clsx("max-w-[90%] p-3 rounded-2xl text-sm font-sans", msg.role === 'user' ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white/10 text-stone-200 rounded-tl-none")}>
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
            <form onSubmit={handleSendMessage} className="relative shrink-0 font-sans">
              <input
                type="text"
                placeholder="Preguntá sobre el fallo..."
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
        </div>
      </div>
    </motion.div>
  );
}
