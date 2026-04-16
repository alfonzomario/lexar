import { useState } from 'react';
import { Link } from 'react-router';
import { Scale, Search, Filter, Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { UploadBriefModal } from '../components/UploadBriefModal';
import { useQuery } from '@tanstack/react-query';

export function Briefs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const { data: briefs = [], isLoading, refetch } = useQuery({
    queryKey: ['briefs'],
    queryFn: async () => {
      const res = await fetch('/api/briefs');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  const filteredBriefs = briefs.filter(
    (brief: any) =>
      brief.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      brief.keywords?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      brief.subject_names?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="w-5 h-5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por título, tema o materia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-stone-200 rounded-xl w-full md:w-80 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button className="p-2 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors text-stone-600 shrink-0">
              <Filter className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="w-full sm:w-auto bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors shrink-0 shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-indigo-200" />
            Aportar Jurisprudencia
          </button>
        </div>
      </div>

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
