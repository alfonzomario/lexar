import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Bookmark, Scale, Trash2, Landmark, Calendar, BookA, Newspaper, ChevronRight, FileText, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { UserRoleBadge } from '../components/UserRoleBadge';
import { clsx } from 'clsx';

type SavedItem = {
  resource_type: string;
  resource_id: number;
  created_at: string;
  title: string;
  url: string;
  details: any;
};

export function SavedForLater() {
  const { user } = useAuth();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('brief');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [counts, setCounts] = useState<Record<string, number>>({
    brief: 0,
    norma: 0,
    note: 0,
    latinism: 0,
    article: 0
  });
  const limit = 6;

  const isBasicOrAbove = user && ['basic', 'pro', 'admin', 'super_admin'].includes(user.tier);

  const tabs = [
    { id: 'brief', label: 'Fallos', color: 'indigo' },
    { id: 'norma', label: 'Normativa', color: 'indigo' },
    { id: 'note', label: 'Apuntes', color: 'emerald' },
    { id: 'latinism', label: 'Latinismos', color: 'teal' },
    { id: 'article', label: 'Artículos', color: 'amber' },
  ];

  const fetchList = () => {
    if (!user || !isBasicOrAbove) return;
    setLoading(true);
    const headers = { 'X-User-Id': String(user.id) };
    fetch(`/api/saved-for-later?resource_type=${activeTab}&page=${page}&limit=${limit}`, { headers })
      .then((res) => (res.ok ? res.json() : { items: [], totalPages: 1, counts: {} }))
      .then((data) => {
        setItems(data.items || []);
        setTotalPages(data.totalPages || 1);
        if (data.counts) {
          setCounts(data.counts);
        }
      })
      .catch(() => {
        setItems([]);
        setTotalPages(1);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchList();
  }, [user?.id, isBasicOrAbove, activeTab, page]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setPage(1);
  };

  const remove = (resourceType: string, resourceId: number) => {
    if (!user) return;
    fetch(`/api/saved-for-later?resource_type=${resourceType}&resource_id=${resourceId}`, {
      method: 'DELETE',
      headers: { 'X-User-Id': String(user.id) },
    }).then(() => fetchList());
  };

  const filteredItems = items;

  const renderBriefCard = (item: SavedItem) => {
    const brief = item.details;
    if (!brief) return null;
    return (
      <div className="bg-white p-6 rounded-2xl border border-stone-200 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between h-full relative">
        <div>
          <h3 className="text-lg font-bold text-stone-900 mb-2 leading-tight pr-8">
            {brief.title}
          </h3>
          {(brief.court || brief.year) && (
            <div className="flex flex-wrap gap-2 mb-3">
              {brief.court && (
                <span className="text-[10px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Landmark className="w-2.5 h-2.5" /> {brief.court}
                </span>
              )}
              {brief.year && (
                <span className="text-[10px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Calendar className="w-2.5 h-2.5" /> {brief.year}
                </span>
              )}
            </div>
          )}
          <p className="text-stone-500 text-sm line-clamp-3 mb-4">
            {brief.relevance}
          </p>
        </div>
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-stone-100">
          <Link to={item.url} className="text-indigo-600 font-bold text-sm flex items-center gap-1 hover:underline">
            Ver fallo <ChevronRight className="w-4 h-4" />
          </Link>
          <button
            onClick={() => remove(item.resource_type, item.resource_id)}
            className="text-stone-400 hover:text-red-650 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
            title="Quitar de guardados"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const renderNormaCard = (item: SavedItem) => {
    const norma = item.details;
    if (!norma) return null;
    return (
      <div className="bg-white p-6 rounded-2xl border border-stone-200 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between h-full relative">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[10px] font-bold uppercase tracking-wider border border-stone-200">
              {norma.tipo} {norma.numero}/{norma.anio}
            </span>
            <span className={clsx(
              "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border",
              norma.estado === 'Vigente' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
            )}>
              {norma.estado}
            </span>
          </div>
          <h3 className="text-lg font-bold text-stone-900 mb-2 leading-tight pr-8">
            {norma.titulo}
          </h3>
          <p className="text-stone-500 text-xs mt-1">
            Organismo: {norma.organismo}
          </p>
        </div>
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-stone-100">
          <Link to={item.url} className="text-indigo-600 font-bold text-sm flex items-center gap-1 hover:underline">
            Ver norma <ChevronRight className="w-4 h-4" />
          </Link>
          <button
            onClick={() => remove(item.resource_type, item.resource_id)}
            className="text-stone-400 hover:text-red-650 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
            title="Quitar de guardados"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const renderNoteCard = (item: SavedItem) => {
    const note = item.details;
    if (!note) return null;
    return (
      <div className="bg-white p-6 rounded-2xl border border-stone-200 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between h-full relative">
        <div>
          <h3 className="text-lg font-bold text-stone-900 mb-2 leading-tight pr-8">
            {note.title}
          </h3>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2">
            <span className="bg-emerald-100/50 px-2.5 py-1 rounded-md">{note.subject_name}</span>
          </div>
          {note.university_name && (
            <p className="text-xs text-stone-500 mb-1">Univ: {note.university_name}</p>
          )}
          {(note.chair_name || note.professor) && (
            <p className="text-xs text-stone-500 mb-2">
              Cátedra: {note.chair_name} {note.professor && `(Prof. ${note.professor})`}
            </p>
          )}
        </div>
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-stone-100">
          <Link to={item.url} className="text-emerald-600 font-bold text-sm flex items-center gap-1 hover:underline">
            Ver materia <ChevronRight className="w-4 h-4" />
          </Link>
          <button
            onClick={() => remove(item.resource_type, item.resource_id)}
            className="text-stone-400 hover:text-red-650 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
            title="Quitar de guardados"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const renderLatinismCard = (item: SavedItem) => {
    const l = item.details;
    if (!l) return null;
    return (
      <div className="bg-white p-6 rounded-2xl border border-stone-200 hover:border-teal-300 hover:shadow-md transition-all flex flex-col justify-between h-full relative">
        <div>
          <h2 className="text-2xl font-bold font-serif text-stone-900 mb-1 pr-8">{l.term}</h2>
          <p className="text-teal-600 font-medium text-sm mb-4">{l.translation}</p>
          <p className="text-stone-700 text-sm leading-relaxed">{l.meaning}</p>
        </div>
        <div className="flex justify-end items-center mt-4 pt-3 border-t border-stone-100">
          <button
            onClick={() => remove(item.resource_type, item.resource_id)}
            className="text-stone-400 hover:text-red-655 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
            title="Quitar de guardados"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const renderArticleCard = (item: SavedItem) => {
    const article = item.details;
    if (!article) return null;
    return (
      <div className="bg-white p-6 rounded-2xl border border-stone-200 hover:border-amber-300 hover:shadow-md transition-all flex flex-col justify-between h-full relative">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-stone-100 w-8 h-8 rounded-full flex items-center justify-center font-bold text-stone-500 text-sm">
              {article.author_name?.charAt(0) || 'A'}
            </div>
            <div>
              <p className="font-bold text-xs text-stone-900 flex items-center gap-1.5">
                {article.author_name}
                <UserRoleBadge role={article.author_role} className="scale-[0.8] origin-left" />
              </p>
              <p className="text-[10px] text-stone-500">{new Date(article.date).toLocaleDateString('es-AR')}</p>
            </div>
          </div>
          <h3 className="text-lg font-bold text-stone-900 mb-2 leading-tight">
            {article.title}
          </h3>
          <p className="text-stone-500 text-sm line-clamp-3">
            {article.content}
          </p>
        </div>
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-stone-100">
          <Link to={item.url} className="text-amber-600 font-bold text-sm flex items-center gap-1 hover:underline">
            Ver artículo <ChevronRight className="w-4 h-4" />
          </Link>
          <button
            onClick={() => remove(item.resource_type, item.resource_id)}
            className="text-stone-400 hover:text-red-655 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
            title="Quitar de guardados"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const renderCard = (item: SavedItem) => {
    switch (item.resource_type) {
      case 'brief':
        return renderBriefCard(item);
      case 'norma':
        return renderNormaCard(item);
      case 'note':
        return renderNoteCard(item);
      case 'latinism':
        return renderLatinismCard(item);
      case 'article':
        return renderArticleCard(item);
      default:
        return null;
    }
  };

  const getEmptyState = () => {
    switch (activeTab) {
      case 'brief':
        return {
          icon: <Scale className="w-12 h-12 text-indigo-400" />,
          text: 'No tenés fallos guardados todavía.',
          linkText: 'Explorar fallos',
          link: '/briefs'
        };
      case 'norma':
        return {
          icon: <Scale className="w-12 h-12 text-indigo-400" />,
          text: 'No tenés normativas guardadas todavía.',
          linkText: 'Buscar normas',
          link: '/normativa'
        };
      case 'note':
        return {
          icon: <FileText className="w-12 h-12 text-emerald-400" />,
          text: 'No tenés apuntes guardados todavía.',
          linkText: 'Explorar materias',
          link: '/subjects'
        };
      case 'latinism':
        return {
          icon: <BookA className="w-12 h-12 text-teal-400" />,
          text: 'No tenés latinismos guardados todavía.',
          linkText: 'Ver diccionario',
          link: '/latinisms'
        };
      case 'article':
        return {
          icon: <Newspaper className="w-12 h-12 text-amber-400" />,
          text: 'No tenés artículos guardados todavía.',
          linkText: 'Leer artículos',
          link: '/articles'
        };
      default:
        return {
          icon: <Bookmark className="w-12 h-12 text-stone-400" />,
          text: 'Lista vacía',
          linkText: 'Volver al inicio',
          link: '/'
        };
    }
  };

  if (!user) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto text-center py-16 px-6">
        <div className="bg-white rounded-3xl p-10 border border-stone-200 shadow-sm">
          <Bookmark className="w-14 h-14 text-stone-400 mx-auto mb-4" />
          <p className="text-stone-600 mb-4 font-semibold text-lg">Iniciá sesión y contratá el plan Basic o superior para usar "Para leer después".</p>
          <Link to="/pricing" className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors inline-block shadow-md">Ver planes</Link>
        </div>
      </motion.div>
    );
  }

  if (!isBasicOrAbove) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto text-center py-16 px-6">
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-10 shadow-sm">
          <Bookmark className="w-14 h-14 text-amber-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-stone-900 mb-2">Para leer después (Basic)</h2>
          <p className="text-stone-600 mb-6">Esta función es exclusiva del plan Basic o superior para que puedas tener tus lecturas jurídicas guardadas y organizadas.</p>
          <Link to="/pricing" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-md">Ver planes Basic</Link>
        </div>
      </motion.div>
    );
  }

  const empty = getEmptyState();

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-indigo-100 w-12 h-12 rounded-xl flex items-center justify-center">
          <Bookmark className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-stone-900 font-sans">Panel de Control: Para leer después</h1>
          <p className="text-stone-500 text-sm">Gestioná y organizá todo el contenido guardado por categorías.</p>
        </div>
      </div>

      <div className="flex border-b border-stone-250 overflow-x-auto scrollbar-thin">
        {tabs.map((tab) => {
          const tabCount = counts[tab.id] || 0;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={clsx(
                "px-5 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer",
                activeTab === tab.id
                  ? "border-indigo-650 text-indigo-650"
                  : "border-transparent text-stone-500 hover:text-stone-750"
              )}
            >
              {tab.label}
              {tabCount > 0 && (
                <span className={clsx(
                  "text-[10px] px-2 py-0.5 rounded-full font-bold",
                  activeTab === tab.id ? "bg-indigo-100 text-indigo-700" : "bg-stone-100 text-stone-600"
                )}>
                  {tabCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Grid Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 border-dashed p-16 text-center text-stone-500 shadow-sm max-w-xl mx-auto">
          <div className="bg-stone-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-stone-100">
            {empty.icon}
          </div>
          <p className="text-lg font-bold text-stone-700 mb-1">{empty.text}</p>
          <p className="text-sm text-stone-400 mb-6">Agregá elementos usando el botón de guardar en la plataforma.</p>
          <Link to={empty.link} className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-sm">
            {empty.linkText}
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item) => (
                <motion.div
                  layout
                  key={`${item.resource_type}-${item.resource_id}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderCard(item)}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-stone-200 shadow-sm mt-4 font-sans">
              <button
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm font-medium rounded-xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-50 transition-colors"
              >
                Anterior
              </button>
              <span className="text-sm text-stone-500 font-medium">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm font-medium rounded-xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-50 transition-colors"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
