import { Scale, ArrowRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';

export function BriefsTab({ subjectId }: { subjectId: number }) {
  const { data: briefs = [], isLoading } = useQuery({
    queryKey: ['briefs', subjectId],
    queryFn: async () => {
      const res = await fetch('/api/briefs');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      return data.filter((b: any) => {
        const ids = b.subject_ids ? String(b.subject_ids).split(',').map((n: string) => Number(n.trim())) : [];
        return ids.includes(subjectId);
      });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {briefs.length === 0 ? (
        <div className="col-span-full text-center py-12 text-stone-500 bg-white rounded-2xl border border-stone-100 border-dashed">
          <Scale className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No hay fallos en esta materia.</p>
        </div>
      ) : (
        briefs.map((brief: any) => (
          <Link
            key={brief.id}
            to={`/briefs/${brief.id}`}
            className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 hover:border-indigo-200 hover:shadow-md transition-all group flex flex-col h-full"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">Fallo</span>
              {brief.is_demo && <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md">Demo</span>}
            </div>
            <h3 className="text-xl font-semibold mb-2 leading-tight">{brief.title}</h3>
            <p className="text-stone-500 text-sm flex-1 line-clamp-3">{brief.facts}</p>
            <div className="mt-4 flex items-center text-sm font-medium text-indigo-600 group-hover:text-indigo-700">
              Leer resumen <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        ))
      )}
    </div>
  );
}
