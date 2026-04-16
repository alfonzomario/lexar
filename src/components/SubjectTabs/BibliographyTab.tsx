import { BookMarked, ExternalLink, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export function BibliographyTab({ subjectId }: { subjectId: number }) {
  const { data: bibliography = [], isLoading } = useQuery({
    queryKey: ['bibliography', subjectId],
    queryFn: async () => {
      const res = await fetch(`/api/subjects/${subjectId}/bibliography`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
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
    <div className="space-y-4">
      {bibliography.length === 0 ? (
        <div className="text-center py-12 text-stone-500 bg-white rounded-2xl border border-stone-100 border-dashed">
          <BookMarked className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No hay bibliografía cargada para esta materia.</p>
        </div>
      ) : (
        <ul className="grid gap-4">
          {bibliography.map((b: any) => (
            <li key={b.id} className="bg-white p-5 rounded-2xl border border-stone-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-stone-900">{b.title}</p>
                <p className="text-sm text-stone-500">{b.author} {b.type && ` · ${b.type}`}</p>
              </div>
              {b.link && (
                <a href={b.link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 text-sm font-medium flex items-center gap-1">
                  Ver <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
