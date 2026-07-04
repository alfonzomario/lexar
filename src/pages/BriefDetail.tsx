import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router';
import { Scale, ArrowLeft, FileText, Bookmark, Share2, AlertCircle, Sparkles, Trash2, Calendar, Users, Landmark, Book, BookText, X, Check, Download, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import Markdown from 'react-markdown';
import { BalanzaLoader } from '../components/BalanzaLoader';
import { useAuth } from '../contexts/AuthContext';
import { HighlightableText } from '../components/HighlightableText';
import { BriefAiChat } from '../components/BriefAiChat';

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
  const [searchParams] = useSearchParams();
  const highlightQuery = searchParams.get('highlight');
  const { user } = useAuth();
  const [brief, setBrief] = useState<any>(null);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState(highlightQuery ? 'full' : 'tldr');
  const [savedForLater, setSavedForLater] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const [shareDropdownOpen, setShareDropdownOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isSharingInternal, setIsSharingInternal] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const shareDropdownRef = useRef<HTMLDivElement>(null);
  const isBasicOrAbove = user && ['basic', 'pro', 'admin', 'super_admin'].includes(user.tier);
  const isPro = user?.tier === 'pro' || user?.tier === 'admin' || user?.tier === 'super_admin';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setShareDropdownOpen(false);
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (shareDropdownRef.current && !shareDropdownRef.current.contains(e.target as Node)) {
        setShareDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (userQuery.trim().length < 2) {
      setSearchedUsers([]);
      return;
    }
    const delayDebounce = setTimeout(() => {
      fetch(`/api/users?q=${encodeURIComponent(userQuery)}`)
        .then((r) => r.json())
        .then((data) => setSearchedUsers(Array.isArray(data) ? data : []))
        .catch(console.error);
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [userQuery]);

  const handleShareInternal = async () => {
    if (!selectedUser || !brief) return;
    setIsSharingInternal(true);
    setShareSuccess(false);
    try {
      const res = await fetch('/api/messages/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          receiverId: selectedUser.id,
          briefId: brief.id,
          title: brief.title
        })
      });
      if (res.ok) {
        setShareSuccess(true);
        setUserQuery('');
        setSelectedUser(null);
        setTimeout(() => {
          setIsShareModalOpen(false);
          setShareSuccess(false);
        }, 1500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSharingInternal(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Active Highlight & Comment states (Google Docs style)
  const [activeAnnotationId, setActiveAnnotationId] = useState<number | null>(null);
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<number | null>(null);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);

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
    if (highlightQuery && brief) {
      setActiveTab('full');
      const timer = setTimeout(() => {
        const el = document.getElementById('annotation-span--999');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [highlightQuery, brief]);

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
    if (activeTab !== 'full') return;
    const handleScroll = () => {
      const el = textContainerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const elementHeight = rect.height;
      const viewHeight = window.innerHeight;
      
      const scrolled = -rect.top;
      const maxScroll = elementHeight - viewHeight;
      if (maxScroll <= 0) {
        setScrollProgress(0);
        return;
      }
      const progress = Math.min(100, Math.max(0, (scrolled / maxScroll) * 100));
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeTab]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAddAnnotation = async (text: string, note: string, color: string, type: 'highlight' | 'comment' = 'highlight', startIndex?: number, endIndex?: number) => {
    if (!user) return;
    const res = await fetch(`/api/briefs/${id}/annotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        selected_text: text,
        note: note,
        color: color,
        type: type,
        start_index: startIndex ?? null,
        end_index: endIndex ?? null,
      })
    });
    if (res.ok) {
      fetchAnnotations();
      window.getSelection()?.removeAllRanges();
    }
  };

  const handleDeleteAnnotation = async (annId: number) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este comentario?')) return;
    try {
      const res = await fetch(`/api/annotations/${annId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAnnotations();
        if (activeAnnotationId === annId) {
          setActiveAnnotationId(null);
        }
      }
    } catch (error) {
      console.error('Error deleting annotation', error);
    }
  };

  useEffect(() => {
    if (activeAnnotationId) {
      const prefix = focusMode ? 'comment-card-focus-' : 'comment-card-';
      const cardEl = document.getElementById(`${prefix}${activeAnnotationId}`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [activeAnnotationId, focusMode]);

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

  const displayAnnotations = highlightQuery
    ? [
        ...annotations,
        {
          id: -999,
          selected_text: highlightQuery,
          note: 'Referencia citada en la normativa',
          color: 'bg-indigo-100 text-indigo-900 border-b-2 border-indigo-500 font-bold',
          created_at: new Date().toISOString()
        }
      ]
    : annotations;

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

  if (focusMode && activeTab === 'full') {
    return (
      <div className="fixed inset-0 bg-[#FAF9F6] z-[9999] overflow-y-auto custom-scrollbar flex flex-col font-sans">
        <div className="sticky top-0 bg-[#FAF9F6]/95 backdrop-blur-md border-b border-stone-200 z-50">
          <div className="w-full h-1 bg-stone-200/50">
            <div className="h-full bg-indigo-600 transition-all duration-75" style={{ width: `${scrollProgress}%` }} />
          </div>
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setFocusMode(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Salir del Enfoque
              </button>
              <span className="text-stone-300">|</span>
              <span className="text-stone-900 font-bold truncate max-w-lg">{brief.title}</span>
            </div>
            <div className="text-xs font-bold text-stone-500 uppercase tracking-widest">
              Modo Enfoque
            </div>
          </div>
        </div>

        <div className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-10 gap-10 items-start">
          <div ref={textContainerRef} className="lg:col-span-7 bg-[#FDFBF7] p-8 md:p-14 rounded-3xl border border-stone-200 shadow-[inset_0_2px_20px_rgba(0,0,0,0.04)] max-w-[800px] mx-auto w-full">
            <div className="text-base text-stone-850 leading-relaxed text-justify">
              <HighlightableText
                text={brief.full_text || brief.facts || ''}
                annotations={displayAnnotations}
                onAddAnnotation={handleAddAnnotation}
                activeAnnotationId={activeAnnotationId}
                setActiveAnnotationId={setActiveAnnotationId}
                hoveredAnnotationId={hoveredAnnotationId}
                setHoveredAnnotationId={setHoveredAnnotationId}
              />
            </div>
          </div>

          <div className="lg:col-span-3 space-y-4 lg:sticky lg:top-24 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-indigo-600" />
              Comentarios ({annotations.length})
            </h3>
            {annotations.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
                <p className="text-stone-400 text-sm font-medium">No hay comentarios en esta sentencia.</p>
                <p className="text-stone-400 text-xs mt-2 leading-relaxed">Pincelá una parte del texto y hacé clic derecho para agregar un comentario.</p>
              </div>
            ) : (
              annotations.map((ann) => {
                const isHighlighted = ann.id === activeAnnotationId || ann.id === hoveredAnnotationId;
                return (
                  <div
                    key={ann.id}
                    id={`comment-card-focus-${ann.id}`}
                    onClick={() => setActiveAnnotationId(ann.id)}
                    onMouseEnter={() => setHoveredAnnotationId(ann.id)}
                    onMouseLeave={() => setHoveredAnnotationId(null)}
                    className={clsx(
                      "p-4 rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm text-left relative group font-sans",
                      isHighlighted
                        ? "bg-amber-50 border-amber-300 ring-2 ring-indigo-500/20 scale-[1.02]"
                        : "bg-white border-stone-200 hover:border-amber-200"
                    )}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAnnotation(ann.id);
                      }}
                      className="absolute top-3 right-3 text-stone-400 hover:text-red-650 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Eliminar comentario"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="text-xs text-stone-500 italic mb-2 line-clamp-2 border-l-2 border-indigo-200 pl-2">
                      "{ann.selected_text}"
                    </div>
                    <p className="text-stone-800 text-sm font-medium pr-6 leading-relaxed">{ann.note}</p>
                    <div className="mt-3 flex items-center justify-between text-[10px] text-stone-400 border-t border-stone-100 pt-2">
                      <span className="font-semibold text-stone-500">Tú</span>
                      <span>{ann.created_at ? new Date(ann.created_at).toLocaleString() : ''}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 space-y-8"
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
              <div className="relative" ref={shareDropdownRef}>
                <button 
                  onClick={() => setShareDropdownOpen(!shareDropdownOpen)} 
                  className={clsx(
                    "p-2 rounded-full transition-colors z-20",
                    shareDropdownOpen ? "text-indigo-600 bg-indigo-50" : "text-stone-400 hover:text-indigo-600 hover:bg-indigo-50"
                  )}
                  title="Compartir..."
                >
                  <Share2 className="w-5 h-5" />
                </button>

                <AnimatePresence>
                  {shareDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-stone-200 z-[100] overflow-hidden py-1"
                    >
                      <button
                        onClick={handleCopyLink}
                        className="w-full text-left px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2.5 transition-colors"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4 text-stone-400" />}
                        <span>{copied ? '¡Copiado!' : 'Copiar URL pública'}</span>
                      </button>
                      
                      {user && (
                        <button
                          onClick={() => {
                            setShareDropdownOpen(false);
                            setIsShareModalOpen(true);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2.5 transition-colors border-t border-stone-100"
                        >
                          <Users className="w-4 h-4 text-stone-400" />
                          <span>Compartir en LexAR</span>
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button onClick={handlePrint} className="p-2 text-stone-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors" title="Descargar PDF">
                <Download className="w-5 h-5" />
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
        </div>
      </div>

      {/* Conditional layouts based on activeTab */}
      {activeTab === 'full' ? (
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8 items-start mt-8 relative">
          {/* Left Column: Full Ruling Text (70% width) */}
          <div 
            ref={textContainerRef} 
            className="lg:col-span-7 bg-[#FDFBF7] p-8 md:p-14 lg:p-20 rounded-3xl shadow-[inset_0_2px_20px_rgba(0,0,0,0.04)] border border-stone-200/60 w-full relative overflow-hidden"
          >
            {/* Reading Progress Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-stone-200/50">
              <div className="h-full bg-indigo-600 transition-all duration-75" style={{ width: `${scrollProgress}%` }} />
            </div>

            <div className="flex items-center justify-between mb-8 border-b border-stone-200 pb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-stone-850 tracking-tight" style={{ fontFamily: "'Lora', Georgia, serif" }}>
                Sentencia Completa
              </h2>
              <button
                onClick={() => setFocusMode(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors shadow-sm"
              >
                <Sparkles className="w-4 h-4" /> Modo Enfoque
              </button>
            </div>

            <div className="text-base text-stone-850 leading-relaxed text-justify">
              <HighlightableText
                text={brief.full_text || brief.facts || ''}
                annotations={displayAnnotations}
                onAddAnnotation={handleAddAnnotation}
                activeAnnotationId={activeAnnotationId}
                setActiveAnnotationId={setActiveAnnotationId}
                hoveredAnnotationId={hoveredAnnotationId}
                setHoveredAnnotationId={setHoveredAnnotationId}
              />
            </div>
          </div>

          {/* Right Column: Google Docs Comments Sidebar (30% width) */}
          <div className="lg:col-span-3 space-y-4 lg:sticky lg:top-24 max-h-[85vh] overflow-y-auto pr-2 custom-scrollbar">
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4 flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <Bookmark className="w-4 h-4 text-indigo-600" />
              Comentarios ({annotations.length})
            </h3>
            {annotations.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
                <p className="text-stone-400 text-sm font-medium">No hay comentarios en esta sentencia.</p>
                <p className="text-stone-400 text-xs mt-2 leading-relaxed">Pincelá una parte del texto y hacé clic derecho para agregar un comentario.</p>
              </div>
            ) : (
              annotations.map((ann) => {
                const isHighlighted = ann.id === activeAnnotationId || ann.id === hoveredAnnotationId;
                return (
                  <div
                    key={ann.id}
                    id={`comment-card-${ann.id}`}
                    onClick={() => setActiveAnnotationId(ann.id)}
                    onMouseEnter={() => setHoveredAnnotationId(ann.id)}
                    onMouseLeave={() => setHoveredAnnotationId(null)}
                    className={clsx(
                      "p-4 rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm text-left relative group font-sans",
                      isHighlighted
                        ? "bg-amber-50 border-amber-300 ring-2 ring-indigo-500/20 scale-[1.02]"
                        : "bg-white border-stone-200 hover:border-amber-200"
                    )}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAnnotation(ann.id);
                      }}
                      className="absolute top-3 right-3 text-stone-400 hover:text-red-650 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Eliminar comentario"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    <div className="text-xs text-stone-500 italic mb-2 line-clamp-2 border-l-2 border-indigo-200 pl-2">
                      "{ann.selected_text}"
                    </div>
                    <p className="text-stone-800 text-sm font-medium pr-6 leading-relaxed">{ann.note}</p>
                    <div className="mt-3 flex items-center justify-between text-[10px] text-stone-400 border-t border-stone-100 pt-2">
                      <span className="font-semibold text-stone-500">Tú</span>
                      <span>{ann.created_at ? new Date(ann.created_at).toLocaleString() : ''}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          <div className="lg:col-span-3 space-y-8">
            {activeTab === 'tldr' && (
              <div className="space-y-8">
                {isPro && (
                  <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm mb-8">
                    <h3 className="font-bold text-stone-900 mb-2 flex items-center gap-2 text-lg">
                      <Sparkles className="w-5 h-5 text-indigo-600" />
                      Resumen con IA
                    </h3>
                    {!aiSummary && !aiSummaryLoading && (
                      <button type="button" onClick={fetchAiSummary} className="text-sm px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-bold hover:bg-indigo-100 transition-colors">
                        Generar resumen automático
                      </button>
                    )}
                    {aiSummaryLoading && <p className="text-sm text-stone-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Generando resumen...</p>}
                    {aiSummary && !aiSummaryLoading && (
                      <div className="text-sm text-stone-700 leading-relaxed whitespace-pre-line mt-2 bg-stone-50 p-4 rounded-xl border border-stone-100">
                        <Markdown>{aiSummary}</Markdown>
                      </div>
                    )}
                  </div>
                )}
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

                {/* Hechos del Caso */}
                {brief.facts && (
                  <section className="bg-white p-8 rounded-2xl shadow-sm border border-stone-100">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-stone-900 border-b border-stone-50 pb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      <BookText className="w-5 h-5 text-indigo-600" />
                      Hechos del Caso
                    </h2>
                    <div className="text-base md:text-lg text-stone-800 leading-[1.9] whitespace-pre-line" style={{ fontFamily: "'Lora', Georgia, serif" }}>
                      <HighlightableText text={formatParagraphs(brief.facts)} annotations={annotations} onAddAnnotation={handleAddAnnotation} />
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

                {brief.dissents && brief.dissents !== 'No presenta disidencias' && (
                  <section className="bg-white p-8 rounded-2xl shadow-sm border border-stone-100">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-stone-900 border-b border-stone-50 pb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      <Users className="w-5 h-5 text-rose-500" />
                      Votos en Disidencia
                    </h2>
                    <div className="text-base md:text-lg text-stone-800 leading-[1.9] bg-rose-50/40 p-6 rounded-xl whitespace-pre-line border border-rose-100/50" style={{ fontFamily: "'Lora', Georgia, serif" }}>
                      <HighlightableText text={formatParagraphs(brief.dissents)} annotations={annotations} onAddAnnotation={handleAddAnnotation} />
                    </div>
                  </section>
                )}

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
      )}

      {/* Global Floating AI Widget */}
      <div className="fixed bottom-6 right-6 z-[1000] flex flex-col items-end gap-4 pointer-events-none">
        <AnimatePresence>
          {isAiChatOpen && (
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-24 right-6 bottom-24 w-[350px] lg:w-[360px] pointer-events-auto"
            >
              <BriefAiChat
                resourceId={id!}
                resourceType="brief"
                messages={messages}
                setMessages={setMessages}
                input={input}
                setInput={setInput}
                aiLoading={aiLoading}
                setAiLoading={setAiLoading}
                isFloating={true}
                onClose={() => setIsAiChatOpen(false)}
                className="h-full w-full"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsAiChatOpen(!isAiChatOpen)}
          className="pointer-events-auto w-14 h-14 bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white rounded-full shadow-2xl hover:shadow-indigo-500/50 transition-all flex items-center justify-center hover:scale-105 active:scale-95 border-2 border-white/25 relative group"
          title={isAiChatOpen ? "Cerrar Asistente" : "Asistente LexARG"}
        >
          {isAiChatOpen ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6 animate-pulse" />}
          {!isAiChatOpen && (
            <span className="absolute right-16 bg-stone-900 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md pointer-events-none font-sans">
              Asistente LexARG
            </span>
          )}
        </button>
      </div>

      {/* Modal de Compartir Interno */}
      <AnimatePresence>
        {isShareModalOpen && (
          <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col font-sans"
            >
              <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-stone-900">Compartir en LexAR</h3>
                <button 
                  onClick={() => {
                    setIsShareModalOpen(false);
                    setSelectedUser(null);
                    setUserQuery('');
                  }} 
                  className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {shareSuccess ? (
                  <div className="text-center py-8 space-y-3">
                    <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                      <Check className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-stone-900">¡Fallo compartido con éxito!</p>
                    <p className="text-xs text-stone-500">Se le ha enviado un mensaje interno al usuario.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-stone-500 leading-relaxed text-left">
                      Buscá a otro usuario registrado en LexAR por su nombre o correo electrónico para enviarle el acceso directo a este fallo.
                    </p>

                    {/* Buscador */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Buscar usuario..."
                        value={userQuery}
                        onChange={(e) => setUserQuery(e.target.value)}
                        className="w-full text-sm pl-4 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-left"
                      />
                      <span className="absolute right-3 top-3 text-stone-400">
                        <Users className="w-4 h-4" />
                      </span>
                    </div>

                    {/* Lista de Resultados */}
                    {searchedUsers.length > 0 && (
                      <div className="border border-stone-150 rounded-xl max-h-48 overflow-y-auto divide-y divide-stone-100 bg-white">
                        {searchedUsers.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => {
                              setSelectedUser(u);
                              setUserQuery('');
                              setSearchedUsers([]);
                            }}
                            className="w-full text-left px-4 py-2.5 text-xs hover:bg-stone-50 transition-colors flex items-center justify-between"
                          >
                            <div>
                              <p className="font-semibold text-stone-800">{u.name}</p>
                              <p className="text-stone-400">{u.email}</p>
                            </div>
                            <span className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                              {u.profileRole || 'Usuario'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Usuario Seleccionado */}
                    {selectedUser && (
                      <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 flex items-center justify-between text-left">
                        <div>
                          <p className="text-xs font-bold text-indigo-900">Destinatario seleccionado:</p>
                          <p className="text-sm font-semibold text-stone-850">{selectedUser.name}</p>
                          <p className="text-xs text-stone-500">{selectedUser.email}</p>
                        </div>
                        <button 
                          onClick={() => setSelectedUser(null)}
                          className="text-xs text-red-600 hover:underline font-medium"
                        >
                          Cambiar
                        </button>
                      </div>
                    )}

                    {/* Botón de Enviar */}
                    <button
                      onClick={handleShareInternal}
                      disabled={isSharingInternal || !selectedUser}
                      className="w-full py-3 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {isSharingInternal ? (
                        <span>Compartiendo...</span>
                      ) : (
                        <span>Compartir Fallo</span>
                      )}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </motion.div>
    </div>
  );
}
