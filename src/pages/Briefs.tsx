import { useState } from 'react';
import { Link } from 'react-router';
import { Scale, Search, Filter, Sparkles, Loader2, X, ChevronDown, Landmark, Calendar, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UploadBriefModal } from '../components/UploadBriefModal';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';

export function Briefs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Advanced filters
  const [filterTribunal, setFilterTribunal] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterTema, setFilterTema] = useState('');

  const hasActiveFilters = !!filterTribunal || !!filterYear || !!filterTema;

  const { data: briefs = [], isLoading, refetch } = useQuery({
    queryKey: ['briefs', filterTribunal, filterYear, filterTema],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterTribunal) params.append('tribunal', filterTribunal);
      if (filterYear) params.append('year', filterYear);
      if (filterTema) params.append('tema', filterTema);
      const res = await fetch(`/api/briefs?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  // Extract unique values for filter dropdowns
  const tribunals = [...new Set(briefs.map((b: any) => b.court).filter(Boolean))];
  const years = [...new Set(briefs.map((b: any) => b.year).filter(Boolean))].sort((a: number, b: number) => b - a);

  const filteredBriefs = briefs.filter(
    (brief: any) =>
      brief.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      brief.keywords?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      brief.subject_names?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const clearFilters = () => {
    setFilterTribunal('');
    setFilterYear('');
    setFilterTema('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 flex items-center gap-2">
            <Scale className="w-8 h-8 text-indigo-600" />
            Catálogo de Fallos
          </h1>
          <p className="text-stone-500 mt-2">
            Explorá jurisprudencia clave resumida y estructurada.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-0 w-full sm:w-auto bg-white border border-stone-200 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 overflow-hidden transition-all">
            <div className="relative flex-1 sm:flex-none">
              <Search className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar contenido..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 pr-4 py-3 bg-transparent border-none w-full md:w-72 focus:outline-none focus:ring-0 text-sm"
              />
            </div>
            <div className="w-px h-6 bg-stone-200 hidden sm:block"></div>
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={clsx(
                "px-4 py-3 transition-colors flex items-center gap-2 text-sm font-medium",
                filtersOpen || hasActiveFilters
                  ? "bg-indigo-50 text-indigo-600"
                  : "hover:bg-stone-50 text-stone-600"
              )}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filtros</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-indigo-600 rounded-full" />
              )}
            </button>
          </div>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 hover:shadow-md hover:-translate-y-0.5 transition-all shrink-0"
          >
            <Sparkles className="w-4 h-4 text-indigo-200" />
            Aportar a la DB
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {filtersOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-stone-900 flex items-center gap-2">
                  <Filter className="w-4 h-4 text-indigo-600" />
                  Filtros Avanzados
                </h3>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-red-500 hover:text-red-600 font-medium flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Limpiar filtros
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Tribunal Filter */}
                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Landmark className="w-3.5 h-3.5" /> Tribunal
                  </label>
                  <div className="relative">
                    <select
                      value={filterTribunal}
                      onChange={(e) => setFilterTribunal(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none text-sm"
                    >
                      <option value="">Todos los tribunales</option>
                      {tribunals.map((t: any) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Year Filter */}
                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Año
                  </label>
                  <div className="relative">
                    <select
                      value={filterYear}
                      onChange={(e) => setFilterYear(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none text-sm"
                    >
                      <option value="">Todos los años</option>
                      {years.map((y: any) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Tema Filter */}
                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" /> Tema / Etiqueta
                  </label>
                  <input
                    type="text"
                    value={filterTema}
                    onChange={(e) => setFilterTema(e.target.value)}
                    placeholder="Ej: amparo, consumidor..."
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Filter Tags */}
      {hasActiveFilters && !filtersOpen && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Filtros:</span>
          {filterTribunal && (
            <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full border border-indigo-100">
              <Landmark className="w-3 h-3" /> {filterTribunal}
              <button onClick={() => setFilterTribunal('')} className="hover:text-indigo-900"><X className="w-3 h-3" /></button>
            </span>
          )}
          {filterYear && (
            <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full border border-indigo-100">
              <Calendar className="w-3 h-3" /> {filterYear}
              <button onClick={() => setFilterYear('')} className="hover:text-indigo-900"><X className="w-3 h-3" /></button>
            </span>
          )}
          {filterTema && (
            <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full border border-indigo-100">
              <Tag className="w-3 h-3" /> {filterTema}
              <button onClick={() => setFilterTema('')} className="hover:text-indigo-900"><X className="w-3 h-3" /></button>
            </span>
          )}
          <button onClick={clearFilters} className="text-xs text-red-500 hover:underline ml-2">Limpiar todo</button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBriefs.map((brief: any) => (
            <Link
              key={brief.id}
              to={`/briefs/${brief.id}`}
              className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 hover:border-indigo-300 transition-all hover:shadow-md flex flex-col h-full"
            >
              <div className="flex flex-wrap gap-2 mb-3">
                {brief.subject_names?.split(',').map((subject: string, idx: number) => (
                  <span key={idx} className="bg-indigo-50 text-indigo-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {subject}
                  </span>
                ))}
              </div>
              <h3 className="text-lg font-bold text-stone-900 mb-2 leading-tight">
                {brief.title}
              </h3>
              {/* Show court and year badges */}
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
              <p className="text-stone-500 text-sm line-clamp-3 flex-1 mb-4">
                {brief.relevance}
              </p>
              <div className="flex flex-wrap gap-1 mt-auto">
                {brief.keywords?.split(',').slice(0, 3).map((keyword: string, idx: number) => (
                  <span key={idx} className="bg-stone-100 text-stone-600 text-[10px] uppercase font-semibold px-2 py-1 rounded-md">
                    {keyword.trim()}
                  </span>
                ))}
              </div>
            </Link>
          ))}
          {filteredBriefs.length === 0 && (
            <div className="col-span-full text-center py-12 text-stone-500">
              No se encontraron fallos que coincidan con tu búsqueda.
            </div>
          )}
        </div>
      )}

      <UploadBriefModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => refetch()}
      />
    </motion.div>
  );
}
