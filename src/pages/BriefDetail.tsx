import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { Scale, ArrowLeft, FileText, Bookmark, Share2, AlertCircle, Sparkles, Trash2, Calendar, Users, Landmark, Book } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import Markdown from 'react-markdown';
import { BalanzaLoader } from '../components/BalanzaLoader';
import { useAuth } from '../contexts/AuthContext';
import { HighlightableText } from '../components/HighlightableText';
import { LegalTextRenderer } from '../components/LegalTextRenderer';

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

  const [relatedBriefs, setRelatedBriefs] = useState<any[]>([]);

  useEffect(() => {
    if (brief && activeTab === 'relacionados' && relatedBriefs.length === 0) {
      fetch('/api/briefs')
        .then(res => res.json())
        .then(data => {
          const currentKw = brief.keywords?.toLowerCase().split(',').map((k: string) => k.trim()) || [];
          const related = data.filter((b: any) => {
            if (b.id === brief.id) return false;
            const kw = b.keywords?.toLowerCase().split(',').map((k: string) => k.trim()) || [];
            return kw.some((k: string) => currentKw.includes(k));
          });
          setRelatedBriefs(related);
        });
    }
  }, [brief, activeTab, relatedBriefs.length]);

  let timelineArr: any[] = [];
  try { if (brief?.timeline) timelineArr = JSON.parse(brief.timeline); } catch(e) {}

  let citationsArr: any[] = [];
  try { if (brief?.citations) citationsArr = JSON.parse(brief.citations); } catch(e) {}

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
          <span>LexARG Briefs</span>
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
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-stone-900 mb-6 leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {brief.title}
              </h1>
              <div className="flex flex-wrap gap-4 mb-6">
                {brief.court && (
                  <div className="flex items-center gap-2 text-stone-600 text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    <Landmark className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>{brief.court}</span>
                  </div>
                )}
                {brief.year && (
                  <div className="flex items-center gap-2 text-stone-600 text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>{brief.year}</span>
                  </div>
                )}
                {brief.parties && (
                  <div className="flex items-center gap-2 text-stone-600 text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    <Users className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>{brief.parties}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mb-8 border-t border-stone-100 pt-6">
                {brief.keywords.split(',').map((kw: string) => (
                  <span key={kw} className="text-xs font-medium text-stone-600 bg-stone-100 px-2 py-1 rounded-md">
                    {kw.trim()}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-1 border-b border-stone-200 overflow-x-auto pb-px sticky top-[72px] bg-[#FAF9F6] z-10 pt-4 px-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'px-5 py-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 whitespace-nowrap rounded-t-lg',
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                    : 'border-transparent text-stone-400 hover:text-stone-700 hover:border-stone-300'
                )}
              >
                {tab.name}
              </button>
            ))}
          </div>

          <div className="mt-8 max-w-full">
            {activeTab === 'tldr' && (
              <div className="space-y-8">
                {timelineArr.length > 0 && (
                  <section className="bg-white p-8 rounded-2xl shadow-sm border border-stone-100">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-stone-900 border-b border-stone-50 pb-2">
                      <Calendar className="w-5 h-5 text-indigo-600" />
                      Línea de Tiempo Procesal
                    </h2>
                    <div className="relative border-l-2 border-stone-100 ml-3 space-y-6">
                      {timelineArr.map((evt: any, idx: number) => (
                        <div key={idx} className="relative pl-6">
                          <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-4 border-white bg-indigo-500 shadow-sm" />
                          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-baseline">
                            <span className="text-sm font-bold text-indigo-600 shrink-0 bg-indigo-50 px-2 py-0.5 rounded-md w-fit">
                              {evt.date}
                            </span>
                            <span className="text-stone-700 leading-relaxed max-w-full text-sm md:text-base">
                              {evt.description}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section className="bg-white p-8 rounded-2xl shadow-sm border border-stone-100">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-stone-900 border-b border-stone-50 pb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    <AlertCircle className="w-5 h-5 text-indigo-600" />
                    Cuestión Jurídica (Issue)
                  </h2>
                  <div className="text-base md:text-lg text-stone-800 leading-[1.9] italic border-l-4 border-indigo-200 pl-5 py-2 whitespace-pre-line" style={{ fontFamily: "'Lora', Georgia, serif" }}>
                    <HighlightableText text={formatParagraphs(brief.issue)} annotations={annotations} onAddAnnotation={handleAddAnnotation} />
                  </div>
                </section>

                <section className="bg-white p-8 rounded-2xl shadow-sm border border-stone-100">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-stone-900 border-b border-stone-50 pb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    <FileText className="w-5 h-5 text-indigo-600" />
                    Regla / Doctrina
                  </h2>
                  <div className="text-base md:text-lg text-stone-800 leading-[1.9] whitespace-pre-line" style={{ fontFamily: "'Lora', Georgia, serif" }}>
                    <HighlightableText text={formatParagraphs(brief.rule)} annotations={annotations} onAddAnnotation={handleAddAnnotation} />
                  </div>
                </section>

                <section className="bg-white p-8 rounded-2xl shadow-sm border border-stone-100">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-stone-900 border-b border-stone-50 pb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    Argumentos Principales
                  </h2>
                  <div className="text-base md:text-lg text-stone-800 leading-[1.9] whitespace-pre-line" style={{ fontFamily: "'Lora', Georgia, serif" }}>
                    <HighlightableText text={formatParagraphs(brief.reasoning)} annotations={annotations} onAddAnnotation={handleAddAnnotation} />
                  </div>
                </section>

                <section className="bg-white p-8 rounded-2xl shadow-sm border border-stone-100">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-stone-900 border-b border-stone-50 pb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    <Scale className="w-5 h-5 text-indigo-600" />
                    Decisión (Holding)
                  </h2>
                  <div className="text-base md:text-lg text-stone-800 leading-[1.9] whitespace-pre-line" style={{ fontFamily: "'Lora', Georgia, serif" }}>
                    <HighlightableText text={formatParagraphs(brief.holding)} annotations={annotations} onAddAnnotation={handleAddAnnotation} />
                  </div>
                </section>

                <section className="bg-white p-8 rounded-2xl shadow-sm border border-stone-100">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-stone-900 border-b border-stone-50 pb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    <Bookmark className="w-5 h-5 text-indigo-600" />
                    Relevancia
                  </h2>
                  <div className="text-base md:text-lg text-stone-800 leading-[1.9] bg-indigo-50/40 p-6 rounded-xl whitespace-pre-line border border-indigo-100/50" style={{ fontFamily: "'Lora', Georgia, serif" }}>
                    <HighlightableText text={formatParagraphs(brief.relevance)} annotations={annotations} onAddAnnotation={handleAddAnnotation} />
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'full' && (
              <div className="bg-[#FDFBF7] p-8 md:p-14 lg:p-20 rounded-3xl shadow-[inset_0_2px_20px_rgba(0,0,0,0.04)] border border-stone-200/60 max-w-4xl mx-auto">
                <h2 className="text-2xl md:text-3xl font-bold mb-10 text-stone-800 border-b border-stone-200 pb-6 text-center tracking-tight" style={{ fontFamily: "'Lora', Georgia, serif" }}>Sentencia Completa</h2>
                <LegalTextRenderer text={brief.facts || ''} />
              </div>
            )}

            {activeTab === 'normativa' && (
              <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-stone-100">
                <h2 className="text-xl font-bold mb-6 text-stone-900 border-b border-stone-100 pb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Normativa y Fallos Citados</h2>
                {citationsArr.length > 0 ? (
                  <div className="space-y-3">
                    {citationsArr.map((cit: any, idx: number) => (
                      <div key={idx} className="p-5 bg-stone-50/80 rounded-xl border border-stone-100 flex flex-col gap-1.5 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all">
                        <span className="font-semibold text-stone-900 text-base flex items-center gap-2" style={{ fontFamily: "'Lora', Georgia, serif" }}>
                          <Book className="w-4 h-4 text-indigo-500 shrink-0" />
                          {cit.norm_name}
                        </span>
                        <span className="text-stone-500 text-xs ml-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Citado en: {cit.considerando_ref}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-stone-400 text-center py-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>La IA no ha extraído normativa citada de este fallo.</p>
                )}
              </div>
            )}

            {activeTab === 'relacionados' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold mb-4 text-stone-900">Fallos Relacionados</h2>
                {relatedBriefs.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {relatedBriefs.map(b => (
                      <Link
                        key={b.id}
                        to={`/briefs/${b.id}`}
                        className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 hover:border-indigo-300 transition-all flex flex-col h-full hover:shadow-md"
                      >
                        <h3 className="text-lg font-bold text-stone-900 mb-2 leading-tight">{b.title}</h3>
                        <p className="text-stone-500 text-sm line-clamp-2 flex-1 mb-4">{b.relevance}</p>
                        <div className="flex flex-wrap gap-1 mt-auto">
                          {b.keywords?.split(',').slice(0, 3).map((kw: string, idx: number) => (
                            <span key={idx} className="bg-stone-100 text-stone-600 text-[10px] uppercase font-semibold px-2 py-1 rounded-md">
                              {kw.trim()}
                            </span>
                          ))}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-stone-500 text-center py-12 bg-white rounded-2xl border border-stone-100">No hay fallos relacionados con estas etiquetas.</p>
                )}
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
                <h3 className="font-bold">Asistente LexARG</h3>
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
